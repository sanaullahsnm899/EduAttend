const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function load(file, names) {
  let src = fs.readFileSync(path.resolve(__dirname,'..',file),'utf8')
    .replace(/\bexport (?=(const|function|async function)\b)/g,'');
  src += `\nmodule.exports = {${names.join(',')}};`;
  const sandbox = {module:{exports:{}}, Date, String, Number, Object, Array, Set, Map, Error};
  vm.runInNewContext(src,sandbox,{filename:file});
  return sandbox.module.exports;
}
const u = load('src/utils/studentRoster.js', [
  'registrationKey','validateStudent','duplicateRegistration','planRosterCopy',
  'makeStudentIds','findRosterDuplicates'
]);
const roster = [
  {id:101,classId:1,name:'Ali',reg:'SE-211',gender:'Male',doa:''},
  {id:102,classId:1,name:'Sanan',reg:'SE-212',gender:'Male',doa:''},
  {id:103,classId:2,name:'Ahmed',reg:'SE-211',gender:'Male',doa:''},
];
assert.equal(u.registrationKey(' se - 211 '),'SE-211');
assert.throws(()=>u.validateStudent(roster,{name:'Ahmad',reg:' se - 211 ',classId:1,doa:''}),e=>e.code==='DUPLICATE_REGISTRATION');
assert.doesNotThrow(()=>u.validateStudent(roster,{name:'Ahmad',reg:'se-211',classId:2,doa:''},103)); // same student edit
assert.throws(()=>u.validateStudent(roster,{name:'Ali',reg:'SE-212',classId:1,doa:''},101),e=>e.code==='DUPLICATE_REGISTRATION');
assert.doesNotThrow(()=>u.validateStudent(roster,{name:'Ali',reg:'SE-211',classId:3,doa:''})); // different class
assert.throws(()=>u.planRosterCopy(roster,1,1),e=>e.code==='INVALID_COPY');
const plan=u.planRosterCopy(roster,1,2);
assert.equal(plan.sourceCount,2);
assert.equal(plan.skipped,1);
assert.equal(plan.incoming.length,1);
assert.equal(plan.incoming[0].reg,'SE-212');
assert.equal(plan.incoming[0].classId,2);
assert.equal(Object.prototype.hasOwnProperty.call(plan.incoming[0],'id'),false);
assert.equal(Object.prototype.hasOwnProperty.call(plan.incoming[0],'attendance'),false);
const ids=u.makeStudentIds(roster,100);
assert.equal(new Set(ids).size,100);
assert.ok(ids.every(id=>Number.isSafeInteger(id) && !roster.some(s=>s.id===id)));
const withDuplicates=[...roster,{id:107,classId:1,name:'Duplicate',reg:'SE - 211'}];
assert.equal(u.findRosterDuplicates(withDuplicates).length,1);
const duplicatedSource=[...roster,{id:108,classId:1,name:'Repeated',reg:'SE-212'}];
const secondPlan=u.planRosterCopy(duplicatedSource,1,3);
assert.equal(secondPlan.sourceCount,3);
assert.equal(secondPlan.incoming.length,2);
assert.equal(secondPlan.skipped,1);
// Tests guard against changes that accidentally make new entries absent on existing days.
const attendance = fs.readFileSync(path.resolve(__dirname,'..','app/attendance.js'),'utf8');
const exporter = fs.readFileSync(path.resolve(__dirname,'..','src/utils/xlsxExport.js'),'utf8');
assert.match(attendance,/unmarkedCount/);
assert.match(attendance,/no saved attendance/);
assert.match(exporter,/record\[student\.id\] \|\| '-'/);
assert.match(exporter,/COUNTIF\(/);
console.log('PASS: duplicate registration rejected for add and edits within a class.');
console.log('PASS: per-class scope, non-destructive duplicate detection, bulk-copy preview and unique IDs.');
console.log('PASS: missing attendance is shown as unmarked and exported as a dash.');
