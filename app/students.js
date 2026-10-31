import { Text } from '../src/components/Typography';
// FILE: app/students.js
import React, { useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../src/context/AppContext';
import {
  Header,
  BottomNav,
  PrimaryBtn,
  InputField,
  Avatar,
  Chip,
  EmptyState,
  BottomSheetModal,
  PickerRow,
  FadeInUp,
} from '../src/components/UI';
import { COLORS, SIZES, FONTS } from '../src/utils/theme';
import { planRosterCopy, findRosterDuplicates, duplicateRegistration, groupStudentsForDisplay } from '../src/utils/studentRoster';

const EMPTY_FORM = {
  name: '',
  reg: '',
  classId: null,
  gender: 'Male',
  doa: '',
};

const GENDER_OPTIONS = [
  { label: 'Male', value: 'Male' },
  { label: 'Female', value: 'Female' },
  { label: 'Other', value: 'Other' },
];

export default function StudentsScreen() {
  const router = useRouter();
  const { classes, students, addStudent, updateStudent, deleteStudent, copyStudentsToClass } = useApp();

  const [filterClassId, setFilterClassId] = useState('all');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [copyVisible, setCopyVisible] = useState(false);
  const [copySource, setCopySource] = useState(null);
  const [copyTarget, setCopyTarget] = useState(null);
  const [copying, setCopying] = useState(false);
  const [subjectAction, setSubjectAction] = useState(null);

  const classOptions = [
    { label: 'All Classes', value: 'all' },
    ...classes.map((c) => ({ label: c.name, value: c.id })),
  ];

  const classPickerOptions = [
    { label: 'No Class', value: null },
    ...classes.map((c) => ({ label: c.name, value: c.id })),
  ];

  const filteredStudents = useMemo(() => {
    if (filterClassId === 'all') return students;
    return students.filter((s) => s.classId === filterClassId);
  }, [students, filterClassId]);

  const displayStudents = useMemo(() => groupStudentsForDisplay(filteredStudents), [filteredStudents]);

  const duplicates = useMemo(() => findRosterDuplicates(students, filterClassId), [students, filterClassId]);
  const copyPlan = useMemo(() => {
    if (copySource == null || copyTarget == null || copySource === copyTarget) return null;
    return planRosterCopy(students, copySource, copyTarget);
  }, [students, copySource, copyTarget]);

  function openCopy() {
    setCopySource(null);
    setCopyTarget(filterClassId === 'all' ? null : filterClassId);
    setCopyVisible(true);
  }

  function confirmCopy() {
    if (!copyPlan || !copyPlan.incoming.length || copying) return;
    const origin = getClassName(copySource);
    const destination = getClassName(copyTarget);
    Alert.alert('Copy student roster?',
      `Copy ${copyPlan.incoming.length} students from ${origin} to ${destination}?\n\n${copyPlan.skipped} duplicate/invalid registration numbers will be skipped. Attendance records and history will NOT be copied.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Copy students', onPress: async () => {
          setCopying(true);
          try {
            const result = await copyStudentsToClass(copySource, copyTarget);
            setCopyVisible(false);
            setFilterClassId(copyTarget);
            Alert.alert('Roster copied', `${result.copied} students copied. ${result.skipped} skipped. Attendance data was not copied.`);
          } catch (error) {
            Alert.alert('Could not copy students', error?.message || 'Please try again.');
          } finally { setCopying(false); }
        } },
      ]);
  }

  function getClassName(classId) {
    const cls = classes.find((c) => c.id === classId);
    return cls ? cls.name : 'No Class';
  }

  function openAdd() {
    setEditingStudent(null);
    setForm({ ...EMPTY_FORM, classId: filterClassId === 'all' ? null : filterClassId });
    setModalVisible(true);
  }

  function openEdit(student) {
    setEditingStudent(student);
    setForm({
      name: student.name,
      reg: student.reg,
      classId: student.classId,
      gender: student.gender || 'Male',
      doa: student.doa || '',
    });
    setModalVisible(true);
  }

  function closeModal() {
    setModalVisible(false);
    setEditingStudent(null);
    setForm(EMPTY_FORM);
  }

  async function handleSave() {
    if (!form.name.trim()) {
      Alert.alert('Validation', 'Student name is required.');
      return;
    }
    if (!form.reg.trim()) {
      Alert.alert('Validation', 'Registration number is required.');
      return;
    }
    const conflict = duplicateRegistration(students, form.classId, form.reg, editingStudent?.id ?? null);
    if (conflict) {
      Alert.alert('Duplicate registration number', `This number is already assigned to ${conflict.name} in the selected class.`);
      return;
    }
    setSaving(true);
    try {
      if (editingStudent) {
        await updateStudent(editingStudent.id, form);
      } else {
        await addStudent(form);
      }
      closeModal();
    } catch (e) {
      Alert.alert('Could not save student', e?.message || 'Please try again.');
    } finally {
      setSaving(false);
    }
  }

  function handleDelete(student) {
    Alert.alert(
      'Delete Student',
      `Are you sure you want to delete "${student.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteStudent(student.id),
        },
      ]
    );
  }

  function startSubjectAction(group, mode) {
    if (group.entries.length === 1) {
      if (mode === 'edit') openEdit(group.entries[0]);
      else handleDelete(group.entries[0]);
      return;
    }
    // Do not edit/delete every subject copy from a single ambiguous tap.
    setSubjectAction({ group, mode });
  }

  function chooseSubjectRecord(student) {
    const action = subjectAction?.mode;
    setSubjectAction(null);
    if (action === 'edit') openEdit(student);
    else if (action === 'delete') handleDelete(student);
  }

  const genderColors = {
    Male: COLORS.secondary,
    Female: '#8b4eb7',
    Other: COLORS.warning,
  };

  return (
    <View style={styles.root}>
      <Header title="Students" onBack={() => router.back()} rightComponent={<TouchableOpacity accessibilityRole="button" accessibilityLabel="Add student" style={styles.addBtn} onPress={openAdd}><Ionicons name="add" size={17} color="#fff"/><Text style={styles.addBtnText}>Add</Text></TouchableOpacity>}/>
      <View style={styles.filterWrap}>
        <PickerRow label="Class filter" value={filterClassId} options={classOptions} onSelect={setFilterClassId}/>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Copy students from another class" onPress={openCopy} style={styles.copyShortcut}>
          <Ionicons name="copy-outline" size={17} color={COLORS.primaryDark}/>
          <Text style={styles.copyShortcutText}>Copy students from another class</Text>
          <Ionicons name="chevron-forward" size={16} color={COLORS.primaryDark}/>
        </TouchableOpacity>
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.listHeading}><Text style={styles.listTitle}>Students</Text><Text style={styles.listCount}>{displayStudents.length} unique</Text></View>
        {duplicates.length > 0 && <View style={styles.duplicateWarning}>
          <Ionicons name="alert-circle-outline" size={20} color="#9A6418"/>
          <Text style={styles.duplicateWarningText}>
            {duplicates.length} existing duplicate registration {duplicates.length===1?'number':'numbers'} found. Edit the affected student records to correct them. No records were deleted.
          </Text>
        </View>}
        {displayStudents.length===0?<EmptyState icon="👨‍🎓" title="No students found" subtitle={filterClassId==='all'?'Add your first student to begin.':'No students are assigned to this class.'} actionLabel="Add student" onAction={openAdd}/>:<View style={styles.list}>
          {displayStudents.map((group,idx) => {
            const student = group.student;
            const subjects = group.entries.map(entry => getClassName(entry.classId)).join(' · ');
            return <View key={group.key} style={[styles.studentRow,idx>0&&styles.divider]}>
              <Avatar name={student.name} size={38} bg="#E5F5EE"/>
              <View style={styles.studentInfo}>
                <Text style={styles.studentName} numberOfLines={1}>{student.name}</Text>
                <Text style={styles.studentReg} numberOfLines={1}>{student.reg} · {student.gender || 'Other'}</Text>
                <Text style={styles.subjectNames} numberOfLines={2}>{subjects}</Text>
              </View>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Edit ${student.name} in a subject`} onPress={()=>startSubjectAction(group,'edit')} style={styles.iconBtn}><Ionicons name="create-outline" size={18} color={COLORS.primaryDark}/></TouchableOpacity>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Delete ${student.name} from a subject`} onPress={()=>startSubjectAction(group,'delete')} style={[styles.iconBtn,styles.dangerBtn]}><Ionicons name="trash-outline" size={17} color={COLORS.danger}/></TouchableOpacity>
            </View>;
          })}
        </View>}
      </ScrollView><BottomNav active="/students"/>
      <BottomSheetModal
        visible={modalVisible}
        onClose={closeModal}
        title={editingStudent ? 'Edit Student' : 'Add New Student'}
      >
        <InputField
          label="Full Name *"
          value={form.name}
          onChangeText={(v) => setForm({ ...form, name: v })}
          placeholder="e.g. Muhammad Ali"
        />
        <InputField
          label="Registration Number *"
          value={form.reg}
          onChangeText={(v) => setForm({ ...form, reg: v })}
          placeholder="e.g. 2021-BSCS-001"
        />
        <PickerRow
          label="Class"
          value={form.classId}
          options={classPickerOptions}
          onSelect={(v) => setForm({ ...form, classId: v })}
        />
        <PickerRow
          label="Gender"
          value={form.gender}
          options={GENDER_OPTIONS}
          onSelect={(v) => setForm({ ...form, gender: v })}
        />
        <InputField
          label="Date of Admission (YYYY-MM-DD)"
          value={form.doa}
          onChangeText={(v) => setForm({ ...form, doa: v })}
          placeholder="2024-09-01"
          keyboardType="numbers-and-punctuation"
        />
        <View style={styles.modalBtns}>
          <PrimaryBtn
            label="Cancel"
            onPress={closeModal}
            color="#f0f0f0"
            textColor={COLORS.textPrimary}
            style={{ flex: 1, marginRight: SIZES.sm }}
          />
          <PrimaryBtn
            label={editingStudent ? 'Update' : 'Save'}
            onPress={handleSave}
            loading={saving}
            style={{ flex: 1 }}
          />
        </View>
      </BottomSheetModal>
      <BottomSheetModal visible={!!subjectAction} onClose={() => setSubjectAction(null)} title={subjectAction?.mode === 'delete' ? 'Remove from which subject?' : 'Edit in which subject?'}>
        <Text style={styles.copyDescription}>This student is enrolled in more than one class. Choose the subject record to {subjectAction?.mode === 'delete' ? 'delete' : 'edit'}. Other subjects will not be changed.</Text>
        {(subjectAction?.group?.entries || []).map(entry => <TouchableOpacity
          key={entry.id}
          accessibilityRole="button"
          accessibilityLabel={`${subjectAction?.mode === 'delete' ? 'Delete' : 'Edit'} ${entry.name} in ${getClassName(entry.classId)}`}
          onPress={() => chooseSubjectRecord(entry)}
          style={styles.subjectChoice}>
          <Text style={styles.subjectChoiceText}>{getClassName(entry.classId)}</Text>
          <Ionicons name="chevron-forward" size={18} color={COLORS.primaryDark}/>
        </TouchableOpacity>)}
        <PrimaryBtn label="Cancel" onPress={() => setSubjectAction(null)} color="#F0F4F2" textColor={COLORS.textPrimary} style={{marginTop:12}}/>
      </BottomSheetModal>
      <BottomSheetModal visible={copyVisible} onClose={() => { if (!copying) setCopyVisible(false); }} title="Copy student roster">
        <Text style={styles.copyDescription}>Copy names, registration numbers, gender and admission dates to another subject or class. Existing attendance is never copied.</Text>
        {classes.length < 2 ? <View style={styles.duplicateWarning}><Ionicons name="information-circle-outline" size={20} color="#9A6418"/><Text style={styles.duplicateWarningText}>Create at least two classes first to copy between them.</Text></View> : <>
          <PickerRow label="Copy students FROM" value={copySource} options={[{label:'Choose source class...',value:null},...classes.map(c=>({label:c.name,value:c.id}))]} onSelect={setCopySource}/>
          <PickerRow label="Copy students TO" value={copyTarget} options={[{label:'Choose destination class...',value:null},...classes.map(c=>({label:c.name,value:c.id}))]} onSelect={setCopyTarget}/>
          {copySource != null && copySource === copyTarget && <Text style={styles.copyWarning}>Source and destination must be different classes.</Text>}
          {copyPlan && <View style={styles.copyPreview}>
            <Text style={styles.copyPreviewTitle}>Copy preview</Text>
            <Text style={styles.copyPreviewText}>{copyPlan.sourceCount} students in source class</Text>
            <Text style={styles.copyPreviewText}>{copyPlan.incoming.length} new students to copy</Text>
            <Text style={styles.copyPreviewText}>{copyPlan.skipped} already exist / invalid — will be skipped</Text>
            <Text style={styles.copyPreviewNote}>Student IDs will be new. Attendance and edit history stay separate for each class.</Text>
          </View>}
        </>}
        <View style={styles.modalBtns}>
          <PrimaryBtn label="Cancel" onPress={()=>setCopyVisible(false)} color="#F0F4F2" textColor={COLORS.textPrimary} disabled={copying} style={{flex:1,marginRight:SIZES.sm}}/>
          <PrimaryBtn label={copyPlan?.incoming.length ? `Copy ${copyPlan.incoming.length} students` : 'Nothing to copy'} onPress={confirmCopy} disabled={!copyPlan?.incoming.length || copying} loading={copying} style={{flex:1.4}}/>
        </View>
      </BottomSheetModal>
    </View>
  );
}

const styles=StyleSheet.create({subjectNames:{fontSize:11,color:COLORS.primaryDark,marginTop:4,lineHeight:15},subjectChoice:{minHeight:48,flexDirection:'row',alignItems:'center',justifyContent:'space-between',backgroundColor:'#F4FAF7',borderRadius:11,padding:12,marginTop:8},subjectChoiceText:{fontSize:14,fontWeight:'600',color:COLORS.textPrimary},copyShortcut:{flexDirection:'row',alignItems:'center',gap:8,paddingHorizontal:11,paddingVertical:10,borderRadius:11,backgroundColor:'#E6F5EF',marginBottom:11,minHeight:43},copyShortcutText:{flex:1,fontSize:12,fontWeight:'700',color:COLORS.primaryDark},copyDescription:{fontSize:13,lineHeight:19,color:COLORS.textSecondary,marginBottom:16},copyPreview:{padding:14,backgroundColor:'#F2F9F5',borderColor:COLORS.border,borderWidth:1,borderRadius:12,marginTop:6},copyPreviewTitle:{fontSize:14,fontWeight:'700',color:COLORS.textPrimary,marginBottom:7},copyPreviewText:{fontSize:12,color:COLORS.textPrimary,marginVertical:3},copyPreviewNote:{fontSize:11,lineHeight:17,color:COLORS.textSecondary,marginTop:10},copyWarning:{fontSize:12,color:'#9A6418',marginBottom:8},duplicateWarning:{flexDirection:'row',alignItems:'flex-start',gap:8,backgroundColor:'#FFF5E4',borderRadius:11,padding:12,marginBottom:12},duplicateWarningText:{flex:1,fontSize:12,color:'#805819',lineHeight:17},root:{flex:1,backgroundColor:COLORS.background},filterWrap:{paddingHorizontal:14,paddingTop:13,paddingBottom:2,backgroundColor:'#fff',borderBottomWidth:1,borderBottomColor:COLORS.border},scroll:{flex:1},scrollContent:{padding:14,paddingBottom:28},listHeading:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:12},listTitle:{fontSize:16,fontWeight:'700',color:COLORS.textPrimary},listCount:{fontSize:12,color:COLORS.textSecondary},list:{backgroundColor:'#fff',borderRadius:15,borderColor:COLORS.border,borderWidth:1,overflow:'hidden'},studentRow:{flexDirection:'row',alignItems:'center',paddingHorizontal:10,paddingVertical:11,gap:8,minHeight:64},divider:{borderTopWidth:1,borderTopColor:COLORS.border},studentInfo:{flex:1,minWidth:0,marginLeft:3},studentName:{fontSize:13,fontWeight:'700',color:COLORS.textPrimary},studentReg:{fontSize:11,color:COLORS.textSecondary,marginTop:4},iconBtn:{height:36,width:36,backgroundColor:'#F2F8F5',borderRadius:10,alignItems:'center',justifyContent:'center'},dangerBtn:{backgroundColor:'#FFF1F3'},addBtn:{flexDirection:'row',gap:4,alignItems:'center',backgroundColor:COLORS.primary,borderRadius:10,paddingHorizontal:13,minHeight:37},addBtnText:{color:'#fff',fontWeight:'700',fontSize:12},modalBtns:{flexDirection:'row',marginTop:12}});
