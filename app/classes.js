import { Text } from '../src/components/Typography';
// FILE: app/classes.js
import React, { useState } from 'react';
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
  Card,
  Chip,
  EmptyState,
  BottomSheetModal,
  FadeInUp,
} from '../src/components/UI';
import { COLORS, SIZES, FONTS } from '../src/utils/theme';

const EMPTY_FORM = { name: '', teacher: '', start: '', end: '' };

export default function ClassesScreen() {
  const router = useRouter();
  const { classes, students, addClass, updateClass, deleteClass } = useApp();

  const [modalVisible, setModalVisible] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  function openAdd() {
    setEditingClass(null);
    setForm(EMPTY_FORM);
    setModalVisible(true);
  }

  function openEdit(cls) {
    setEditingClass(cls);
    setForm({
      name: cls.name,
      teacher: cls.teacher,
      start: cls.start,
      end: cls.end,
    });
    setModalVisible(true);
  }

  function closeModal() {
    setModalVisible(false);
    setEditingClass(null);
    setForm(EMPTY_FORM);
  }

  async function handleSave() {
    if (!form.name.trim()) {
      Alert.alert('Validation', 'Class name is required.');
      return;
    }
    if (!form.teacher.trim()) {
      Alert.alert('Validation', 'Teacher name is required.');
      return;
    }
    setSaving(true);
    try {
      if (editingClass) {
        await updateClass(editingClass.id, form);
      } else {
        await addClass(form);
      }
      closeModal();
    } catch (e) {
      Alert.alert('Error', 'Failed to save class. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  function handleDelete(cls) {
    Alert.alert(
      'Delete Class',
      `Are you sure you want to delete "${cls.name}"? Students in this class will be unassigned.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteClass(cls.id),
        },
      ]
    );
  }

  function getStudentCount(classId) {
    return students.filter((s) => s.classId === classId).length;
  }

  return (
    <View style={styles.root}>
      <Header title="Classes" onBack={() => router.back()} rightComponent={<TouchableOpacity accessibilityRole="button" accessibilityLabel="Add class" style={styles.addBtn} onPress={openAdd}><Ionicons name="add" size={17} color="#fff"/><Text style={styles.addBtnText}>Add</Text></TouchableOpacity>}/>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.pageIntro}><Text style={styles.pageTitle}>Your classes</Text><Text style={styles.pageCount}>{classes.length} {classes.length===1?'class':'classes'}</Text></View>
        {classes.length===0?<EmptyState icon="🏫" title="No classes yet" subtitle="Create your first class to start taking attendance." actionLabel="Add a class" onAction={openAdd}/>:classes.map(cls=>{
          const count=getStudentCount(cls.id);
          return <View key={cls.id} style={styles.classCard}>
            <View style={styles.cardHead}><View style={styles.classIcon}><Ionicons name="school-outline" size={23} color={COLORS.primaryDark}/></View><View style={{flex:1,minWidth:0}}><Text style={styles.className}>{cls.name}</Text><Text style={styles.teacherName} numberOfLines={1}>{cls.teacher}</Text></View><TouchableOpacity accessibilityRole="button" accessibilityLabel={`Edit ${cls.name}`} style={styles.iconBtn} onPress={()=>openEdit(cls)}><Ionicons name="create-outline" size={19} color={COLORS.primaryDark}/></TouchableOpacity><TouchableOpacity accessibilityRole="button" accessibilityLabel={`Delete ${cls.name}`} style={[styles.iconBtn,styles.dangerBtn]} onPress={()=>handleDelete(cls)}><Ionicons name="trash-outline" size={18} color={COLORS.danger}/></TouchableOpacity></View>
            <View style={styles.cardMeta}><Ionicons name="calendar-outline" size={14} color={COLORS.textSecondary}/><Text style={styles.metaText}>{cls.start||'No start date'} — {cls.end||'No end date'}</Text><View style={styles.studentsBadge}><Ionicons name="people-outline" size={13} color={COLORS.primaryDark}/><Text style={styles.studentsText}>{count}</Text></View></View>
            <View style={styles.cardFoot}><TouchableOpacity accessibilityRole="button" style={styles.openRegister} onPress={()=>router.push({pathname:'/attendance',params:{classId:cls.id}})}><Ionicons name="checkmark-circle-outline" size={17} color="#fff"/><Text style={styles.openRegisterText}>Take attendance</Text></TouchableOpacity><TouchableOpacity accessibilityRole="button" style={styles.openReport} onPress={()=>router.push({pathname:'/reports',params:{classId:cls.id}})}><Ionicons name="bar-chart-outline" color={COLORS.primaryDark} size={17}/><Text style={styles.openReportText}>Reports</Text></TouchableOpacity></View>
          </View>;
        })}
      </ScrollView><BottomNav active="/classes"/>
      <BottomSheetModal
        visible={modalVisible}
        onClose={closeModal}
        title={editingClass ? 'Edit Class' : 'Add New Class'}
      >
        <InputField
          label="Class Name *"
          value={form.name}
          onChangeText={(v) => setForm({ ...form, name: v })}
          placeholder="e.g. BSCS 3rd Semester"
        />
        <InputField
          label="Teacher Name *"
          value={form.teacher}
          onChangeText={(v) => setForm({ ...form, teacher: v })}
          placeholder="e.g. Dr. Ahmad Khan"
        />
        <InputField
          label="Start Date (YYYY-MM-DD)"
          value={form.start}
          onChangeText={(v) => setForm({ ...form, start: v })}
          placeholder="2024-09-01"
          keyboardType="numbers-and-punctuation"
        />
        <InputField
          label="End Date (YYYY-MM-DD)"
          value={form.end}
          onChangeText={(v) => setForm({ ...form, end: v })}
          placeholder="2024-12-31"
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
            label={editingClass ? 'Update' : 'Save'}
            onPress={handleSave}
            loading={saving}
            style={{ flex: 1 }}
          />
        </View>
      </BottomSheetModal>
    </View>
  );
}

const styles=StyleSheet.create({root:{flex:1,backgroundColor:COLORS.background},scroll:{flex:1},scrollContent:{padding:14,paddingBottom:28},pageIntro:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:12},pageTitle:{fontSize:16,fontWeight:'700',color:COLORS.textPrimary},pageCount:{fontSize:12,color:COLORS.textSecondary},addBtn:{flexDirection:'row',gap:4,alignItems:'center',backgroundColor:COLORS.primary,borderRadius:10,paddingHorizontal:13,minHeight:37},addBtnText:{color:'#fff',fontWeight:'700',fontSize:12},classCard:{backgroundColor:'#fff',borderWidth:1,borderColor:COLORS.border,borderRadius:16,marginBottom:11,padding:13},cardHead:{flexDirection:'row',alignItems:'center',gap:9},classIcon:{height:41,width:41,borderRadius:12,backgroundColor:COLORS.primaryLight,justifyContent:'center',alignItems:'center'},className:{fontWeight:'700',fontSize:15,color:COLORS.textPrimary},teacherName:{fontSize:12,color:COLORS.textSecondary,marginTop:3},iconBtn:{width:35,height:35,backgroundColor:'#F2F8F5',borderRadius:10,alignItems:'center',justifyContent:'center'},dangerBtn:{backgroundColor:'#FFF1F3'},cardMeta:{flexDirection:'row',alignItems:'center',gap:5,marginTop:14,paddingBottom:13,borderBottomWidth:1,borderBottomColor:COLORS.border},metaText:{fontSize:11,color:COLORS.textSecondary,flex:1},studentsBadge:{flexDirection:'row',gap:4,alignItems:'center',backgroundColor:COLORS.primaryLight,paddingHorizontal:7,paddingVertical:4,borderRadius:8},studentsText:{fontWeight:'700',fontSize:11,color:COLORS.primaryDark},cardFoot:{marginTop:12,flexDirection:'row',gap:9},openRegister:{flex:1.5,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:6,minHeight:40,backgroundColor:COLORS.primaryDark,borderRadius:10},openRegisterText:{color:'#fff',fontWeight:'700',fontSize:12},openReport:{flex:1,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:5,minHeight:40,borderRadius:10,backgroundColor:COLORS.primaryLight},openReportText:{color:COLORS.primaryDark,fontWeight:'700',fontSize:12},modalBtns:{flexDirection:'row',marginTop:12}});
