import { Text } from '../src/components/Typography';
// FILE: app/reports.js
import React, { useState, useMemo } from 'react';
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
  PrimaryBtn,
  InputField,
  StatusBadge,
  EmptyState,
  PickerRow,
} from '../src/components/UI';
import { exportAttendanceXLSX } from '../src/utils/xlsxExport';
import { COLORS, SIZES, FONTS } from '../src/utils/theme';
import { localDateKey } from '../src/utils/dates';

export default function ReportsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { classes, students, attendance, settings } = useApp();

  const today = localDateKey();

  const [selectedDate, setSelectedDate] = useState(typeof params.date === 'string' ? params.date : today);
  const [selectedClassId, setSelectedClassId] = useState(
    params.classId ? Number(params.classId) : null
  );
  const [exporting, setExporting] = useState(false);

  const classOptions = [
    { label: 'Choose a class...', value: null },
    ...classes.map((c) => ({ label: c.name, value: c.id })),
  ];

  const reportData = useMemo(() => {
    if (!selectedClassId || !selectedDate) return [];

    const key = `${selectedDate}_${selectedClassId}`;
    const record = attendance[key];
    const studentsInClass = students.filter((s) => s.classId === selectedClassId);

    return studentsInClass.map((student) => ({
      student,
      status: record ? (record[student.id] || null) : null,
    }));
  }, [selectedDate, selectedClassId, attendance, students]);

  const stats = useMemo(() => {
    const present = reportData.filter((r) => r.status === 'P').length;
    const absent = reportData.filter((r) => r.status === 'A').length;
    const leave = reportData.filter((r) => r.status === 'L').length;
    return { present, absent, leave, total: reportData.length };
  }, [reportData]);

  const hasRecord = useMemo(() => {
    if (!selectedClassId || !selectedDate) return false;
    const key = `${selectedDate}_${selectedClassId}`;
    return !!attendance[key];
  }, [selectedDate, selectedClassId, attendance]);

  function getClassName(classId) {
    const cls = classes.find((c) => c.id === classId);
    return cls ? cls.name : '—';
  }

  async function handleExport() {
    if (!selectedClassId) {
      Alert.alert('Select Class', 'Please select a class to export.');
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

    const studentsInClass = students.filter((s) => s.classId === selectedClassId);
    setExporting(true);
    try {
      await exportAttendanceXLSX(classObj, studentsInClass, attendance, allDates, settings.schoolName);
    } catch (e) {
      Alert.alert('Export Error', e.message || 'Failed to export Excel file.');
    } finally {
      setExporting(false);
    }
  }

  return (
    <View style={styles.root}>
      <Header title="Reports" onBack={() => router.back()}/>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.filtersCard}>
          <View style={styles.filterHead}><Text style={styles.headTitle}>Find a register</Text><TouchableOpacity accessibilityRole="button" onPress={()=>setSelectedDate(localDateKey())} style={styles.today}><Ionicons name="today-outline" size={15} color={COLORS.primaryDark}/><Text style={styles.todayLabel}>Today</Text></TouchableOpacity></View>
          <View style={styles.filterRow}><View style={{flex:1.12,minWidth:0}}><PickerRow label="Class" value={selectedClassId} options={classOptions} onSelect={setSelectedClassId}/></View><View style={{flex:.9,minWidth:0}}><InputField label="Date (YYYY-MM-DD)" value={selectedDate} onChangeText={setSelectedDate} placeholder="YYYY-MM-DD" keyboardType="numbers-and-punctuation" style={{fontSize:12,paddingHorizontal:9}}/></View></View>
        </View>
        {!selectedClassId ? <EmptyState icon="📊" title="Choose a class" subtitle="Select a class and date to review the saved register."/> : !hasRecord ? <EmptyState icon="📋" title="No saved register" subtitle={`Nothing saved for ${getClassName(selectedClassId)} on ${selectedDate}.`} actionLabel="Take attendance" onAction={()=>router.push({pathname:'/attendance',params:{classId:selectedClassId}})}/> : <>
          <View style={styles.reportHeadline}><View style={{flex:1}}><Text style={styles.headTitle} numberOfLines={1}>{getClassName(selectedClassId)}</Text><Text style={styles.reportDate}>{selectedDate} · {stats.total} students</Text></View><View style={styles.savedPill}><Ionicons name="checkmark-circle" size={14} color={COLORS.primaryDark}/><Text style={styles.savedText}>Saved</Text></View></View>
          <View style={styles.stats}>{[{value:stats.present,label:'Present',color:COLORS.presentBg},{value:stats.absent,label:'Absent',color:COLORS.absentBg},{value:stats.leave,label:'Leave',color:'#B87B20'}].map(s=><View key={s.label} style={styles.stat}><Text style={[styles.statValue,{color:s.color}]}>{s.value}</Text><Text style={styles.statLabel}>{s.label}</Text></View>)}</View>
          <View style={styles.list}><View style={styles.listHeading}><Text style={styles.listTitle}>Student register</Text><Text style={styles.listHelp}>STATUS</Text></View>{reportData.map(({student,status},idx)=><View key={student.id} style={[styles.row,idx>0&&styles.rowDivider]}><Text style={styles.rowIndex}>{idx+1}</Text><View style={{flex:1,minWidth:0}}><Text style={styles.rowName} numberOfLines={1}>{student.name}</Text><Text style={styles.rowReg}>{student.reg}</Text></View>{status ? <StatusBadge status={status}/> : <Text style={styles.unmarked}>Unmarked</Text>}</View>)}</View>
          <PrimaryBtn label="Export Excel report" color={COLORS.secondary} onPress={handleExport} loading={exporting} style={{marginTop:12}}/>
        </>}
      </ScrollView><BottomNav active="/reports"/>
    </View>
  );
}

const styles=StyleSheet.create({unmarked:{fontSize:11,color:COLORS.textSecondary,fontStyle:'italic'},root:{flex:1,backgroundColor:COLORS.background},scroll:{flex:1},scrollContent:{padding:13,paddingBottom:28},filtersCard:{backgroundColor:'#fff',padding:12,borderWidth:1,borderColor:COLORS.border,borderRadius:15,marginBottom:10},filterHead:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:6},headTitle:{color:COLORS.textPrimary,fontWeight:'700',fontSize:15},today:{flexDirection:'row',alignItems:'center',gap:5,backgroundColor:COLORS.primaryLight,paddingHorizontal:10,paddingVertical:7,borderRadius:8},todayLabel:{color:COLORS.primaryDark,fontWeight:'700',fontSize:11},filterRow:{flexDirection:'row',alignItems:'flex-start',gap:9},reportHeadline:{flexDirection:'row',alignItems:'center',paddingHorizontal:3,marginTop:9,marginBottom:11},reportDate:{fontSize:12,color:COLORS.textSecondary,marginTop:3},savedPill:{backgroundColor:COLORS.primaryLight,borderRadius:9,paddingHorizontal:9,paddingVertical:7,flexDirection:'row',gap:4,alignItems:'center'},savedText:{fontSize:11,color:COLORS.primaryDark,fontWeight:'700'},stats:{flexDirection:'row',gap:8,marginBottom:12},stat:{flex:1,backgroundColor:'#fff',borderRadius:12,borderWidth:1,borderColor:COLORS.border,padding:12,alignItems:'center'},statValue:{fontSize:22,fontWeight:'700'},statLabel:{color:COLORS.textSecondary,fontSize:11,marginTop:3},list:{backgroundColor:'#fff',borderRadius:15,borderColor:COLORS.border,borderWidth:1,overflow:'hidden'},listHeading:{flexDirection:'row',justifyContent:'space-between',padding:12,borderBottomColor:COLORS.border,borderBottomWidth:1},listTitle:{fontSize:14,fontWeight:'700',color:COLORS.textPrimary},listHelp:{fontWeight:'600',fontSize:10,color:COLORS.textSecondary,letterSpacing:.7},row:{minHeight:61,paddingVertical:10,paddingHorizontal:12,alignItems:'center',flexDirection:'row',gap:9},rowDivider:{borderTopWidth:1,borderTopColor:COLORS.border},rowIndex:{fontWeight:'600',width:19,fontSize:11,color:COLORS.textSecondary},rowName:{fontSize:13,fontWeight:'700',color:COLORS.textPrimary},rowReg:{color:COLORS.textSecondary,fontSize:11,marginTop:3}});
