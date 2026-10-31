/** Run with plain Node. Exercises actual view grouping and actual XLSX worksheet builder with mocked native APIs. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
function load(file, bindings, names) {
  let src = fs.readFileSync(path.join(root,file),'utf8')
    .replace(/^import .*;\s*$/gm,'')
    .replace(/\bexport (?=(const|function|async function)\b)/g,'');
  src += `\nmodule.exports = {${names.join(',')}};`;
  const context = {module:{exports:{}},console,Date,String,Number,Object,Array,Map,Set,Error,...bindings};
  vm.runInNewContext(src, context,{filename:file});
  return context.module.exports;
}
(async () => {
  const roster = load('src/utils/studentRoster.js', {}, ['groupStudentsForDisplay']);
  const records = [
    {id:1,classId:10,reg:'211',name:'Ali',gender:'Male'},
    {id:2,classId:10,reg:'212',name:'Sanan',gender:'Male'},
    {id:3,classId:20,reg:' 211 ',name:'ALI ',gender:'Male'},
    {id:4,classId:20,reg:'212',name:'Sanan',gender:'Male'},
    {id:5,classId:20,reg:'214',name:'Nurul',gender:'Female'},
  ];
  const groups = roster.groupStudentsForDisplay(records);
  assert.equal(groups.length,3, 'student appears once across two classes');
  assert.deepEqual(Array.from(groups, g => g.entries.length), [2,2,1]);
  assert.equal(groups[0].entries[0].id,1);
  assert.equal(groups[0].entries[1].id,3);
  assert.equal(roster.groupStudentsForDisplay(records.filter(s=>s.classId===10)).length,2);
  // Do not merge unrelated people with the same roll in two different classes.
  assert.equal(roster.groupStudentsForDisplay([...records,{id:6,classId:30,reg:'211',name:'Another Ali'}]).length,4);
  // Preexisting duplicates inside one class must remain visible to resolve.
  assert.equal(roster.groupStudentsForDisplay([...records,{id:7,classId:10,reg:'211',name:'Ali'}]).length,4);

  const encodeCol = c => { let x=c+1, out='';while(x){out=String.fromCharCode(65+(x-1)%26)+out;x=Math.floor((x-1)/26)}return out;};
  const addr = ({r,c})=>`${encodeCol(c)}${r+1}`;
  const excel = {
    utils:{
      encode_cell:addr,
      encode_range:(s,e)=> e ? `${addr(s)}:${addr(e)}` : `${addr(s.s)}:${addr(s.e)}`,
      book_new:()=>({SheetNames:[],Sheets:{}}),
      book_append_sheet:(wb,ws,name)=>{wb.SheetNames.push(name);wb.Sheets[name]=ws;},
    },
    write: (wb)=>{excel.lastWorkbook=wb; return 'fake-base64-xlsx';},
  };
  const written=[];
  const fakeFS = {documentDirectory:'file:///EduAttend/',writeAsStringAsync: async (...args)=>{written.push(args);}};
  const exporter = load('src/utils/xlsxExport.js',{XLSX:excel,FileSystem:fakeFS,Sharing:{isAvailableAsync:async()=>false}}, ['buildClassSheet','exportAttendanceXLSX']);
  const cls={id:10,name:'Artificial Intelligence',teacher:'Dr. Waqas',start:'2026-08-01',end:'2026-12-31'};
  const pupils=[
    {id:1,name:'Ali',reg:'211'},
    {id:2,name:'Sanan',reg:'212'},
    {id:3,name:'Saif',reg:'213'},
    {id:4,name:'Nurul',reg:'214'},
    {id:5,name:'Ahmad',reg:'215'},
    {id:6,name:'Added later',reg:'216'},
  ];
  const attendance={
    '2026-10-30_10':{1:'P',2:'P',3:'P',4:'A',5:'A'},
    '2026-10-31_10':{1:'P',2:'A',3:'L',4:'P',5:'A'},
  };
  const ws=exporter.buildClassSheet(cls,pupils,attendance,['2026-10-30','2026-10-31'],'SE');
  assert.equal(ws['!ref'],'A1:G12', 'two-date exports should not include 15+ blank columns');
  assert.equal(ws.D7.v,'P');assert.equal(ws.E7.v,'P');
  assert.equal(ws.F7.v,2);assert.equal(ws.G7.v,1);assert.equal(ws.G7.z,'0.0%');
  assert.match(ws.F7.f,/COUNTIF\(D7:E7,"P"\)/);
  assert.match(ws.G7.f,/IFERROR\(/);
  assert.equal(ws.F8.v,1);assert.equal(ws.G8.v,0.5);
  assert.equal(ws.F9.v,1);assert.equal(ws.G9.v,0.5);
  assert.equal(ws.F10.v,1);assert.equal(ws.G10.v,0.5);
  assert.equal(ws.F11.v,0);assert.equal(ws.G11.v,0);
  assert.equal(ws.D12.v,'-');assert.equal(ws.E12.v,'-');
  assert.equal(ws.F12.v,0);assert.equal(ws.G12.v,0);
  assert.equal(ws['!cols'].length,7);
  await exporter.exportAttendanceXLSX(cls,pupils,attendance,['2026-10-31','2026-10-30'],'SE');
  assert.equal(written.length,1);
  assert.equal(excel.lastWorkbook.Sheets['Artificial Intelligence'].F7.v,2);
  const oneDay=exporter.buildClassSheet(cls,[pupils[0]],{'2026-10-31_10':{1:'P'}},['2026-10-31'],'SE');
  assert.equal(oneDay.E7.v,1);assert.equal(oneDay.F7.v,1);
  const zeroDay=exporter.buildClassSheet(cls,[pupils[0]],{},[],'SE');
  assert.equal(zeroDay.D7.v,0);assert.equal(zeroDay.E7.v,0);
  console.log('PASS: All Classes shows 3 unique students for 5 subject enrolments; no source records merged or deleted.');
  console.log('PASS: Excel calculated values: 2/2=100%, 1/2=50%, 0/2=0%, unmarked excluded.');
  console.log('PASS: XLSX formula cache, percentage format, compact sheet width and export function.');
})().catch(e=>{console.error('FAIL:',e);process.exitCode=1;});
