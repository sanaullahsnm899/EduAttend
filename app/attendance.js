import { Text } from '../src/components/Typography';
// FILE: app/attendance.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../src/context/AppContext';
import {
  Header,
  BottomNav,
  Avatar,
  PrimaryBtn,
  InputField,
  AttBtn,
  EditHistoryItem,
  EmptyState,
  PickerRow,
  Chip,
} from '../src/components/UI';
import { exportAttendanceXLSX } from '../src/utils/xlsxExport';
import { COLORS, SIZES, FONTS } from '../src/utils/theme';
import { localDateKey, isValidDateKey } from '../src/utils/dates';

function formatDateTime(date) {
  const d = date || new Date();
  const day = String(d.getDate()).padStart(2, '0');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${day} ${month} ${year}, ${hh}:${mm}`;
}

export default function AttendanceScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const {
    classes,
    students,
    attendance,
    settings,
    saveAttendance,
    getAttendance,
    saveEditHistory,
    getEditHistory,
  } = useApp();

  const today = localDateKey();

  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedClassId, setSelectedClassId] = useState(
    params.classId ? Number(params.classId) : null
  );
  const [attRecord, setAttRecord] = useState({});
  const [savedRecord, setSavedRecord] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editHistory, setEditHistory] = useState([]);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);

  const classOptions = [
    { label: 'Select a class...', value: null },
    ...classes.map((c) => ({ label: c.name, value: c.id })),
  ];

  const studentsInClass = selectedClassId
    ? students.filter((s) => s.classId === selectedClassId)
    : [];

  const loadAttendance = useCallback(() => {
    if (!selectedDate || !selectedClassId) return;
    const rec = getAttendance(selectedDate, selectedClassId);
    const hist = getEditHistory(selectedDate, selectedClassId);
    if (rec) {
      setSavedRecord({ ...rec });
      setAttRecord({ ...rec });
    } else {
      setSavedRecord(null);
      const defaultRecord = {};
      studentsInClass.forEach((s) => {
        defaultRecord[s.id] = 'A';
      });
      setAttRecord(defaultRecord);
    }
    setEditHistory(hist || []);
    setIsEditMode(false);
  }, [selectedDate, selectedClassId, attendance, students]);

  useEffect(() => {
    loadAttendance();
  }, [loadAttendance]);

  function setStatus(studentId, status) {
    setAttRecord((prev) => ({ ...prev, [studentId]: status }));
  }

  function getRowStyle(student) {
    const status = attRecord[student.id] || null;
    const isEdited = savedRecord && savedRecord[student.id] !== attRecord[student.id];
    if (isEdited && isEditMode) return { backgroundColor: COLORS.editedRow };
    if (status === 'P') return { backgroundColor: COLORS.presentRow };
    if (status === 'L') return { backgroundColor: COLORS.leaveRow };
    return { backgroundColor: status === 'A' ? COLORS.absentRow : '#FFFFFF' };
  }

  function isEdited(student) {
    return (
      isEditMode &&
      savedRecord &&
      savedRecord[student.id] !== attRecord[student.id]
    );
  }

  async function handleSave() {
    if (!isValidDateKey(selectedDate)) {
      Alert.alert('Check Date', 'Please enter a real date in YYYY-MM-DD format.');
      return;
    }
    if (!selectedClassId) {
      Alert.alert('Select Class', 'Please select a class first.');
      return;
    }
    if (studentsInClass.length === 0) {
      Alert.alert('No Students', 'No students in this class.');
      return;
    }
    const missing = studentsInClass.filter(s => !['P','A','L'].includes(attRecord[s.id]));
    if (missing.length) {
      Alert.alert('Incomplete register', `Mark attendance for ${missing.length} newly added/unmarked student(s) before saving.`);
      return;
    }
    setSaving(true);
    try {
      if (isEditMode && savedRecord) {
        const changes = [];
        studentsInClass.forEach((s) => {
          const oldStatus = savedRecord[s.id] || 'A';
          const newStatus = attRecord[s.id] || 'A';
          if (oldStatus !== newStatus) {
            changes.push({
              student: s.name,
              from: oldStatus,
              to: newStatus,
              time: formatDateTime(new Date()),
            });
          }
        });
        if (changes.length > 0) {
          await saveEditHistory(selectedDate, selectedClassId, changes);
        }
      }
      await saveAttendance(selectedDate, selectedClassId, attRecord);
      setSavedRecord({ ...attRecord });
      setIsEditMode(false);
      Alert.alert('Saved', 'Attendance record saved successfully.');
    } catch (e) {
      Alert.alert('Error', 'Failed to save attendance.');
    } finally {
      setSaving(false);
    }
  }

  async function handleExportXLSX() {
    if (!selectedClassId) {
      Alert.alert('Select Class', 'Please select a class first.');
      return;
    }
    const classObj = classes.find((c) => c.id === selectedClassId);
    if (!classObj) return;
    const allDates = Object.keys(attendance)
      .filter((k) => {
        const parts = k.split('_');
        return parts[parts.length - 1] === String(selectedClassId);
      })
      .map((k) => {
        const parts = k.split('_');
        parts.pop();
        return parts.join('_');
      });
    if (allDates.length === 0) {
      Alert.alert('No Data', 'No attendance records found for this class.');
      return;
    }
    setExporting(true);
    try {
      await exportAttendanceXLSX(classObj, studentsInClass, attendance, allDates, settings.schoolName);
    } catch (e) {
      Alert.alert('Error', 'Excel export failed: ' + e.message);
    } finally {
      setExporting(false);
    }
  }

  function enterEditMode() {
    setIsEditMode(true);
  }

  function exitEditMode() {
    setIsEditMode(false);
    if (savedRecord) {
      setAttRecord({ ...savedRecord });
    }
  }

  const isLocked = savedRecord !== null && !isEditMode;
  const selectedClass = classes.find((c) => c.id === selectedClassId);

  const presentCount = studentsInClass.filter(
    (s) => attRecord[s.id] === 'P'
  ).length;
  const absentCount = studentsInClass.filter(
    (s) => attRecord[s.id] === 'A'
  ).length;
  const leaveCount = studentsInClass.filter(
    (s) => attRecord[s.id] === 'L'
  ).length;

  const unmarkedCount = studentsInClass.filter(s => !['P', 'A', 'L'].includes(attRecord[s.id])).length;
  const recentHistory = editHistory.slice(0, 20);

  return (
    <View style={styles.root}>
      <Header title="Take attendance" onBack={() => router.back()}
        rightComponent={savedRecord && !isEditMode ? <TouchableOpacity accessibilityRole="button" accessibilityLabel="Edit saved register" style={styles.editBtn} onPress={enterEditMode}><Ionicons name="create-outline" size={17} color="#FFFFFF"/><Text style={styles.editBtnText}>Edit</Text></TouchableOpacity> : null} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.selector}>
          <View style={styles.selectorTop}><Text style={styles.sectionTitle}>Register details</Text><TouchableOpacity accessibilityRole="button" onPress={() => setSelectedDate(localDateKey())} style={styles.todayBtn}><Ionicons name="today-outline" color={COLORS.primaryDark} size={15}/><Text style={styles.todayText}>Today</Text></TouchableOpacity></View>
          <View style={styles.selectRow}>
            <View style={{flex:1.1,minWidth:0}}><PickerRow label="Class" value={selectedClassId} options={classOptions} onSelect={setSelectedClassId}/></View>
            <View style={{flex:.93,minWidth:0}}><InputField label="Date (YYYY-MM-DD)" value={selectedDate} onChangeText={setSelectedDate} placeholder="YYYY-MM-DD" keyboardType="numbers-and-punctuation" style={styles.dateInput}/></View>
          </View>
        </View>
        {savedRecord && unmarkedCount > 0 && !isEditMode && <View style={styles.editBanner}>
          <Ionicons name="alert-circle-outline" color="#A06B1A" size={18}/>
          <Text style={styles.editBannerText}>{unmarkedCount} student(s) have no saved attendance for this date. Tap Edit to mark them. They are not automatically absent.</Text>
        </View>}
        {isEditMode && <View style={styles.editBanner}><Ionicons name="create-outline" color="#A06B1A" size={18}/><Text style={styles.editBannerText}>Editing saved attendance. Save your changes when finished.</Text><TouchableOpacity accessibilityRole="button" onPress={exitEditMode}><Text style={styles.cancelEdit}>Cancel</Text></TouchableOpacity></View>}
        {selectedClassId && studentsInClass.length>0 && <View style={styles.summary}>
          <View style={styles.summaryTop}><View style={{flex:1}}><Text style={styles.smallLabel}>REGISTER STATUS</Text><Text style={styles.marked}>{studentsInClass.length} students <Text style={styles.metaText}>· {selectedClass?.name}</Text></Text></View><View style={[styles.stateBadge,savedRecord&&{backgroundColor:COLORS.primaryLight}]}><Ionicons name={savedRecord?'checkmark-circle':'ellipse-outline'} size={14} color={savedRecord?COLORS.primaryDark:'#B0781B'}/><Text style={[styles.stateText,savedRecord&&{color:COLORS.primaryDark}]}>{savedRecord?(isEditMode?'Editing':unmarkedCount?'Needs update':'Saved'):'Unsaved'}</Text></View></View>
          <View style={styles.summaryStats}>{[
            {label:'Present',value:presentCount,color:COLORS.presentBg,bg:'#E7F6EF'},
            {label:'Absent',value:absentCount,color:COLORS.absentBg,bg:'#FDEEF0'},
            {label:'Leave',value:leaveCount,color:'#AA741B',bg:'#FFF3DF'}
          ].map((s,i)=><View key={s.label} style={[styles.summaryItem,i>0&&styles.statBorder]}><View style={[styles.countDot,{backgroundColor:s.color}]}/><Text style={styles.summaryVal}>{s.value}</Text><Text style={styles.summaryName}>{s.label}</Text></View>)}</View>
          {unmarkedCount>0 && <Text style={styles.unmarkedText}>{unmarkedCount} unmarked student(s) — not counted as absent</Text>}
          <View style={styles.distribution}>{[['P',presentCount,COLORS.presentBg],['A',absentCount,COLORS.absentBg],['L',leaveCount,COLORS.leaveBg]].map(([key,count,color])=>count>0?<View key={key} style={{flex:count,backgroundColor:color}}/>:null)}</View>
        </View>}
        {!selectedClassId ? <EmptyState icon="📋" title="Choose your class" subtitle="Select a class to open its register."/> : studentsInClass.length===0 ? <EmptyState icon="👨‍🎓" title="No students in this class" subtitle="Add students before taking attendance." actionLabel="Go to Students" onAction={()=>router.push('/students')}/> : <View style={styles.list}>
          <View style={styles.listHeader}><View><Text style={styles.sectionTitle}>Student register</Text><Text style={styles.registerHint}>Tap P / A / L to mark each student</Text></View><View style={styles.columnTitles}><Text style={styles.columnTitle}>P</Text><Text style={styles.columnTitle}>A</Text><Text style={styles.columnTitle}>L</Text></View></View>
          {studentsInClass.map((student,i)=>{
            const status=attRecord[student.id]||null;const edited=isEdited(student);
            return <View key={student.id} style={[styles.studentRow,i>0&&styles.rowBorder,edited&&{backgroundColor:COLORS.editedRow}]}>
              <View style={styles.index}><Text style={styles.indexText}>{i+1}</Text></View>
              <View style={styles.studentCopy}><Text style={styles.studentName} numberOfLines={1}>{student.name}</Text><Text style={styles.studentReg} numberOfLines={1}>{student.reg}{edited?' · Edited':''}</Text></View>
              <View style={styles.attBtns}><AttBtn status={status} type="P" locked={isLocked} onPress={()=>setStatus(student.id,'P')}/><AttBtn status={status} type="A" locked={isLocked} onPress={()=>setStatus(student.id,'A')}/><AttBtn status={status} type="L" locked={isLocked} onPress={()=>setStatus(student.id,'L')}/></View>
            </View>;
          })}
        </View>}
        {recentHistory.length>0&&<View style={styles.history}><View style={styles.historyTitle}><Ionicons name="time-outline" size={18} color={COLORS.primaryDark}/><Text style={styles.sectionTitle}>Edit history</Text></View>{recentHistory.map((entry,i)=><EditHistoryItem key={i} entry={entry}/>)}</View>}
      </ScrollView>
      {selectedClassId&&studentsInClass.length>0&&<View style={styles.actions}><View style={{flex:1.5}}><PrimaryBtn label={isLocked?'Register saved':isEditMode?'Save changes':'Save register'} onPress={handleSave} loading={saving} disabled={isLocked}/></View><View style={{flex:1}}><PrimaryBtn label="Export Excel" onPress={handleExportXLSX} loading={exporting} color={COLORS.secondary}/></View></View>}
      <BottomNav active="/attendance"/>
    </View>
  );
}

const styles = StyleSheet.create({
  root:{flex:1,backgroundColor:COLORS.background},scroll:{flex:1},scrollContent:{paddingHorizontal:13,paddingTop:12,paddingBottom:18},
  editBtn:{backgroundColor:'#FFFFFF1F',paddingVertical:8,paddingHorizontal:11,borderRadius:10,flexDirection:'row',alignItems:'center',gap:5},editBtnText:{color:'#FFFFFF',fontWeight:'700',fontSize:12},
  selector:{backgroundColor:'#FFFFFF',borderRadius:15,borderWidth:1,borderColor:COLORS.border,padding:12,marginBottom:9},selectorTop:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:7},sectionTitle:{fontSize:15,fontWeight:'700',color:COLORS.textPrimary},todayBtn:{flexDirection:'row',alignItems:'center',backgroundColor:COLORS.primaryLight,borderRadius:8,paddingHorizontal:10,paddingVertical:7,gap:4},todayText:{fontSize:11,fontWeight:'700',color:COLORS.primaryDark},selectRow:{flexDirection:'row',gap:9,alignItems:'flex-start'},dateInput:{fontSize:12,paddingHorizontal:9},
  editBanner:{flexDirection:'row',alignItems:'center',gap:7,padding:11,backgroundColor:'#FFF7E5',borderRadius:11,marginBottom:9},editBannerText:{flex:1,fontSize:12,color:'#8A611C'},cancelEdit:{fontSize:12,color:COLORS.primaryDark,fontWeight:'700'},
  summary:{padding:12,backgroundColor:'#FFFFFF',borderWidth:1,borderColor:COLORS.border,borderRadius:15,marginBottom:9},summaryTop:{flexDirection:'row',alignItems:'center',gap:6},smallLabel:{fontSize:9,fontWeight:'700',letterSpacing:1,color:COLORS.textSecondary},marked:{fontSize:14,fontWeight:'700',color:COLORS.textPrimary,marginTop:4},metaText:{fontWeight:'400',fontSize:12,color:COLORS.textSecondary},stateBadge:{paddingVertical:6,paddingHorizontal:8,borderRadius:9,backgroundColor:'#FFF3E4',flexDirection:'row',alignItems:'center',gap:4},stateText:{fontWeight:'700',fontSize:11,color:'#A36A1A'},summaryStats:{flexDirection:'row',marginTop:12},summaryItem:{flex:1,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:5},statBorder:{borderLeftWidth:1,borderLeftColor:COLORS.border},countDot:{width:6,height:6,borderRadius:3},summaryVal:{fontSize:17,fontWeight:'700',color:COLORS.textPrimary},summaryName:{fontSize:11,color:COLORS.textSecondary},distribution:{height:5,flexDirection:'row',borderRadius:5,overflow:'hidden',backgroundColor:'#E9EFEB',marginTop:12},
  list:{backgroundColor:'#FFFFFF',borderRadius:15,borderColor:COLORS.border,borderWidth:1,overflow:'hidden'},listHeader:{paddingHorizontal:12,paddingTop:13,paddingBottom:11,borderBottomColor:COLORS.border,borderBottomWidth:1,flexDirection:'row',justifyContent:'space-between',alignItems:'flex-end'},registerHint:{color:COLORS.textSecondary,fontSize:11,marginTop:3},columnTitles:{flexDirection:'row',gap:4},columnTitle:{width:43,fontWeight:'700',fontSize:11,textAlign:'center',color:COLORS.textSecondary},studentRow:{flexDirection:'row',alignItems:'center',paddingHorizontal:9,paddingVertical:8,minHeight:63},rowBorder:{borderTopWidth:1,borderTopColor:'#EEF3EF'},index:{width:25,alignItems:'center',justifyContent:'center'},indexText:{color:'#9AAEA5',fontSize:11,fontWeight:'600'},unmarkedText:{fontSize:11,color:'#A06B1A',marginTop:8},studentCopy:{flex:1,minWidth:0,paddingRight:5},studentName:{color:COLORS.textPrimary,fontSize:13,fontWeight:'700'},studentReg:{color:COLORS.textSecondary,fontSize:11,marginTop:3},attBtns:{flexDirection:'row',alignItems:'center'},
  actions:{flexDirection:'row',gap:8,paddingHorizontal:13,paddingVertical:8,borderTopWidth:1,borderTopColor:COLORS.border,backgroundColor:'#FFFFFF'},history:{padding:13,backgroundColor:'#FFFFFF',borderRadius:15,borderColor:COLORS.border,borderWidth:1,marginTop:11},historyTitle:{flexDirection:'row',alignItems:'center',gap:7,marginBottom:7}
});
