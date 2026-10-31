import React from 'react';
import { View, TextInput, TouchableOpacity, Pressable, StyleSheet, Modal, ScrollView, Platform, StatusBar, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from './Typography';
import { COLORS as C, SIZES as S } from '../utils/theme';

export function Logo({ size = 38 }) {
  return <View style={{ width:size,height:size,borderRadius:Math.round(size*.28),backgroundColor:'#D6F6E8',alignItems:'center',justifyContent:'center' }}>
    <Ionicons name="clipboard" size={size*.58} color={C.primaryDark}/>
    <View style={{ position:'absolute',right:-3,bottom:-3,width:size*.38,height:size*.38,borderRadius:size*.19,backgroundColor:C.primary,alignItems:'center',justifyContent:'center',borderColor:'#fff',borderWidth:2 }}>
      <Ionicons name="checkmark" size={size*.25} color="white"/>
    </View>
  </View>;
}

export function Header({ title, onBack, rightComponent }) {
  const insets = useSafeAreaInsets();
  const top = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight||24) : 24);
  return <View style={[styles.header,{ paddingTop: top + 6 }]}>
    {onBack ? <TouchableOpacity accessibilityRole="button" accessibilityLabel="Go back" onPress={onBack} style={styles.backBtn}><Ionicons name="arrow-back" size={21} color="#FFFFFF"/></TouchableOpacity> : null}
    <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
    {rightComponent ? <View style={styles.headerRight}>{rightComponent}</View> : null}
  </View>;
}
const NAV_ITEMS = [
  {route:'/',label:'Home',icon:'home-outline',activeIcon:'home'},
  {route:'/classes',label:'Classes',icon:'grid-outline',activeIcon:'grid'},
  {route:'/attendance',label:'Mark',icon:'checkmark',activeIcon:'checkmark',primary:true},
  {route:'/reports',label:'Reports',icon:'bar-chart-outline',activeIcon:'bar-chart'},
  {route:'/students',label:'Students',icon:'people-outline',activeIcon:'people'},
];
export function BottomNav({ active }) {
  const router = useRouter(); const insets = useSafeAreaInsets();
  return <View style={[styles.nav,{paddingBottom:Math.max(insets.bottom,7)}]}>
    {NAV_ITEMS.map(item => { const current = active===item.route; return <TouchableOpacity key={item.route} accessibilityRole="tab" accessibilityLabel={item.label} accessibilityState={{selected:current}} onPress={()=>{if(!current)router.replace(item.route);}} style={styles.navItem}>
      <View style={[styles.navIconWrap,item.primary&&styles.navPrimary,current&&!item.primary&&styles.navActive]}>
        <Ionicons name={current?item.activeIcon:item.icon} size={item.primary?25:21} color={item.primary?'#fff':current?C.primaryDark:'#899B95'}/>
      </View><Text style={[styles.navText,current&&styles.navTextActive]}>{item.label}</Text>
    </TouchableOpacity>; })}
  </View>;
}
export function PrimaryBtn({ label,onPress,color,textColor,style,disabled,loading }) {
  const bg = color || C.primaryDark; const isDisabled = !!(disabled || loading);
  return <TouchableOpacity accessibilityRole="button" accessibilityLabel={label} accessibilityState={{disabled:isDisabled}} disabled={isDisabled} onPress={onPress} activeOpacity={0.78} style={[styles.primaryBtn,{backgroundColor:bg},isDisabled&&styles.btnDisabled,style]}>
    {loading ? <ActivityIndicator size="small" color={textColor||'#fff'}/> : <Text style={[styles.btnText,{color:textColor||'#fff'}]}>{label}</Text>}
  </TouchableOpacity>;
}
export function InputField({label,value,onChangeText,placeholder,keyboardType,style}) {
  return <View style={styles.field}>{label?<Text style={styles.fieldLabel}>{label}</Text>:null}<TextInput accessibilityLabel={label||placeholder||'Text field'} value={value} onChangeText={onChangeText} placeholder={placeholder||''} placeholderTextColor="#84958E" keyboardType={keyboardType||'default'} selectionColor={C.primary} style={[styles.input,style]}/></View>;
}
export function FadeInUp({children,style}) { return <View style={style}>{children}</View>; }
export function Card({children,style,accent}) { return <View style={[styles.card,style]}>{accent?<View style={styles.cardAccent}/>:null}{children}</View>; }
export function Avatar({name,size=40,bg}) {
  const initials = String(name||'?').trim().split(/\s+/).slice(0,2).map(w=>w[0]||'').join('').toUpperCase();
  return <View style={{width:size,height:size,borderRadius:size/2,backgroundColor:bg||'#E6F5EF',justifyContent:'center',alignItems:'center'}}><Text style={{fontSize:Math.max(13,size*.33),fontWeight:'700',color:bg && bg!=='#E5F5EE'?'#fff':C.primaryDark}}>{initials}</Text></View>;
}
const STATUSES = {P:{label:'Present',color:C.presentBg,text:'#fff'},A:{label:'Absent',color:C.absentBg,text:'#fff'},L:{label:'Leave',color:C.leaveBg,text:'#3A2E1A'}};
export function AttBtn({status,type,onPress,locked}) {
  const active = status===type; const cfg=STATUSES[type];
  return <TouchableOpacity accessibilityRole="button" accessibilityLabel={cfg.label} accessibilityState={{selected:active,disabled:!!locked}} disabled={locked} onPress={onPress} activeOpacity={0.76} style={[styles.attBtn,active?{backgroundColor:cfg.color,borderColor:cfg.color}:styles.attOff]}>
    <Text style={[styles.attText,{color:active?cfg.text:C.textSecondary}]}>{type}</Text>
  </TouchableOpacity>;
}
export function StatusBadge({status}) {const cfg=STATUSES[status]||{label:'Unknown',color:C.border,text:C.textPrimary};return <View style={{backgroundColor:cfg.color,borderRadius:7,paddingHorizontal:10,paddingVertical:5}}><Text style={{color:cfg.text,fontWeight:'700',fontSize:11}}>{cfg.label}</Text></View>;}
export function StatBox({label,value,color,icon}) {return <View style={[styles.stat,{borderTopColor:color||C.primary}]}><Text style={{fontWeight:'700',fontSize:22,color:color||C.primary}}>{value}</Text><Text style={styles.muted}>{label}</Text></View>;}
export function EmptyState({icon,title,subtitle,actionLabel,onAction}) {
  return <View style={styles.empty}><View style={styles.emptyIcon}><Ionicons name={({'📋':'clipboard-outline','👨‍🎓':'people-outline','🏫':'grid-outline','📊':'bar-chart-outline','📭':'file-tray-outline','📁':'folder-open-outline'})[icon]||'file-tray-outline'} size={25} color={C.primaryDark}/></View><Text style={styles.emptyTitle}>{title||'Nothing here yet'}</Text>{subtitle?<Text style={styles.emptySubtitle}>{subtitle}</Text>:null}{actionLabel&&onAction?<TouchableOpacity accessibilityRole="button" onPress={onAction} style={styles.emptyAction}><Text style={{color:C.primaryDark,fontWeight:'700'}}>{actionLabel}</Text></TouchableOpacity>:null}</View>;
}
export function Chip({label,color,textColor,style}) {return <View style={[styles.chip,{backgroundColor:color||C.primaryLight},style]}><Text style={{fontSize:11,fontWeight:'600',color:textColor||C.primaryDark}}>{label}</Text></View>;}
export function BottomSheetModal({visible,onClose,title,children}) {const insets=useSafeAreaInsets();return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}><View style={styles.overlay}><Pressable style={{flex:1}} onPress={onClose} accessibilityLabel="Close dialog"/><View style={[styles.sheet,{paddingBottom:Math.max(insets.bottom,16)}]}><View style={styles.handle}/><View style={styles.sheetHead}><Text style={styles.sheetTitle}>{title}</Text><TouchableOpacity accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} style={styles.close}><Ionicons name="close" size={21} color={C.textSecondary}/></TouchableOpacity></View><ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{paddingBottom:20}}>{children}</ScrollView></View></View></Modal>;}
export function EditHistoryItem({entry}) {return <View style={styles.history}><View style={{flex:1}}><Text style={{fontWeight:'600',color:C.textPrimary,fontSize:13}}>{entry.student}</Text><Text style={{fontSize:11,color:C.textSecondary,marginTop:4}}>{entry.time}</Text></View><StatusBadge status={entry.from}/><Ionicons name="arrow-forward" color={C.textSecondary} size={15} style={{marginHorizontal:5}}/><StatusBadge status={entry.to}/></View>;}
export function PickerRow({label,value,options,onSelect}) {
  const [open,setOpen]=React.useState(false); const selected=options.find(o=>o.value===value);
  return <View style={{marginBottom:10}}>{label?<Text style={styles.fieldLabel}>{label}</Text>:null}<TouchableOpacity accessibilityRole="button" accessibilityLabel={`${label||'Select'}: ${selected?.label||'None'}`} accessibilityState={{expanded:open}} style={[styles.picker,open&&{borderColor:C.primary}]} onPress={()=>setOpen(!open)}><Text style={{fontSize:14,fontWeight:'500',color:C.textPrimary,flex:1}} numberOfLines={1}>{selected?.label||'Select...'}</Text><Ionicons name={open?'chevron-up':'chevron-down'} size={18} color={C.textSecondary}/></TouchableOpacity>{open?<View style={styles.pickerList}>{options.map(opt=><TouchableOpacity key={String(opt.value)} accessibilityRole="button" onPress={()=>{onSelect(opt.value);setOpen(false);}} style={[styles.pickerOption,opt.value===value&&{backgroundColor:C.primaryLight}]}><Text style={{flex:1,fontSize:14,color:C.textPrimary}}>{opt.label}</Text>{opt.value===value?<Ionicons name="checkmark" color={C.primary} size={18}/>:null}</TouchableOpacity>)}</View>:null}</View>;
}
const styles=StyleSheet.create({
  header:{backgroundColor:C.primaryDark,paddingHorizontal:18,paddingBottom:15,flexDirection:'row',alignItems:'center',minHeight:88,gap:12,borderBottomLeftRadius:18,borderBottomRightRadius:18},
  headerTitle:{fontSize:21,fontWeight:'700',color:'#FFFFFF',flex:1,letterSpacing:-.5},
  backBtn:{width:40,height:40,borderRadius:12,backgroundColor:'#FFFFFF19',alignItems:'center',justifyContent:'center'}, headerRight:{marginLeft:6},
  nav:{backgroundColor:'#fff',flexDirection:'row',borderTopWidth:1,borderTopColor:C.border,paddingTop:6,paddingHorizontal:5},
  navItem:{flex:1,alignItems:'center',justifyContent:'center',minHeight:53}, navIconWrap:{width:39,height:31,borderRadius:12,justifyContent:'center',alignItems:'center'},
  navPrimary:{width:47,height:43,backgroundColor:C.primary,marginTop:-13,marginBottom:1,borderRadius:15},navActive:{backgroundColor:C.primaryLight},navText:{fontSize:10,color:C.textSecondary,marginTop:3},navTextActive:{fontWeight:'700',color:C.primaryDark},
  primaryBtn:{minHeight:45,paddingVertical:10,paddingHorizontal:15,borderRadius:12,alignItems:'center',justifyContent:'center'},btnText:{fontSize:13,fontWeight:'700'},btnDisabled:{opacity:.48},
  field:{marginBottom:10},fieldLabel:{fontSize:12,fontWeight:'600',color:'#546D65',marginBottom:6},input:{backgroundColor:'#FFFFFF',borderWidth:1,borderColor:'#CBDDD5',borderRadius:11,minHeight:44,paddingHorizontal:13,paddingVertical:8,fontSize:14,color:C.textPrimary,fontFamily:'Inter_400Regular'},
  card:{backgroundColor:'#fff',borderRadius:16,padding:14,borderWidth:1,borderColor:C.border,marginBottom:12},cardAccent:{height:3,backgroundColor:C.primary,width:36,borderRadius:3,marginBottom:8},
  attBtn:{width:44,height:44,marginLeft:3,justifyContent:'center',alignItems:'center',borderWidth:1,borderRadius:10},attOff:{backgroundColor:'#F6F8F7',borderColor:'#D7E4DE'},attText:{fontWeight:'700',fontSize:14},
  stat:{flex:1,backgroundColor:'#fff',padding:14,borderRadius:12,borderTopWidth:3,alignItems:'center',borderWidth:1,borderColor:C.border},muted:{fontSize:11,color:C.textSecondary,marginTop:3},
  empty:{paddingVertical:38,paddingHorizontal:22,alignItems:'center'},emptyIcon:{width:58,height:58,backgroundColor:C.primaryLight,borderRadius:18,alignItems:'center',justifyContent:'center',marginBottom:12},emptyTitle:{fontWeight:'700',fontSize:17,color:C.textPrimary,textAlign:'center'},emptySubtitle:{fontSize:13,lineHeight:19,color:C.textSecondary,textAlign:'center',marginTop:6},emptyAction:{backgroundColor:C.primaryLight,paddingHorizontal:15,paddingVertical:10,borderRadius:10,marginTop:15},
  chip:{paddingHorizontal:9,paddingVertical:4,borderRadius:8,alignSelf:'flex-start'},overlay:{flex:1,backgroundColor:'#0D292680',justifyContent:'flex-end'},sheet:{maxHeight:'88%',backgroundColor:'#fff',borderTopLeftRadius:22,borderTopRightRadius:22,paddingHorizontal:18},handle:{height:4,width:39,borderRadius:3,backgroundColor:'#D2DFDA',alignSelf:'center',marginTop:9,marginBottom:17},sheetHead:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:18},sheetTitle:{fontWeight:'700',color:C.textPrimary,fontSize:19},close:{width:36,height:36,borderRadius:10,backgroundColor:'#F1F5F3',justifyContent:'center',alignItems:'center'},
  history:{flexDirection:'row',alignItems:'center',paddingVertical:10,borderBottomWidth:1,borderBottomColor:C.border},
  picker:{minHeight:44,borderRadius:11,borderWidth:1,borderColor:'#CBDDD5',backgroundColor:'#fff',paddingHorizontal:13,flexDirection:'row',alignItems:'center',gap:8},pickerList:{backgroundColor:'#fff',borderWidth:1,borderColor:C.border,borderRadius:10,marginTop:5,overflow:'hidden'},pickerOption:{paddingHorizontal:13,paddingVertical:12,flexDirection:'row',alignItems:'center',borderBottomWidth:1,borderBottomColor:'#EDF2EF'},
});
