const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const os=require('node:os');
const path=require('node:path');
const {PowerPreference}=require('../src/main/services/PowerPreference');

async function fixture(t){
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'spb-power-test-'));
  const active=new Set(),starts=[],stops=[];
  let sequence=0;
  const blocker={start(type){starts.push(type);active.add(++sequence);return sequence;},stop(id){assert.ok(active.delete(id),'release only an owned blocker');stops.push(id);}};
  const instances=[];
  t.after(async()=>{for(const instance of instances)await instance.dispose();await fs.rm(root,{recursive:true,force:true});});
  return {root,active,starts,stops,create(file=path.join(root,'power.json')){const instance=new PowerPreference(file,blocker);instances.push(instance);return instance;}};
}

test('host default prevents suspension without keeping the screen on; shutdown releases it once',async t=>{
  const f=await fixture(t),power=await f.create().initialize();
  assert.equal(power.enabled,true);
  assert.deepEqual(f.starts,['prevent-app-suspension']);
  await power.set(true);
  assert.equal(f.starts.length,1);
  await power.dispose();await power.dispose();
  assert.equal(f.active.size,0);assert.equal(f.stops.length,1);
});

test('disabled preference survives restart; toggles immediately apply and persist',async t=>{
  const f=await fixture(t),power=await f.create().initialize();
  assert.deepEqual(await power.set(false),{preventSleepWhileRunning:false});
  assert.equal(f.active.size,0);
  await power.dispose();
  const reopened=await f.create().initialize();
  assert.equal(reopened.enabled,false);assert.equal(f.active.size,0);
  await reopened.set(true);
  assert.equal(f.active.size,1);
  assert.deepEqual(JSON.parse(await fs.readFile(reopened.file,'utf8')),{preventSleepWhileRunning:true});
});

test('concurrent saves preserve order and release old blockers',async t=>{
  const f=await fixture(t),power=await f.create().initialize();
  await Promise.all([power.set(false),power.set(true),power.set(false)]);
  assert.equal(f.active.size,0);assert.equal(power.enabled,false);
  assert.equal(JSON.parse(await fs.readFile(power.file,'utf8')).preventSleepWhileRunning,false);
  assert.deepEqual(await fs.readdir(f.root),['power.json']);
});

test('invalid IPC values cannot alter power state or create a preference file',async t=>{
  const f=await fixture(t),power=await f.create().initialize();
  for(const value of ['false',0,null,{},undefined])await assert.rejects(power.set(value),/布尔/);
  assert.equal(f.active.size,1);assert.deepEqual(await fs.readdir(f.root),[]);
});

test('failed persistence restores runtime behavior and does not poison later saves',async t=>{
  const f=await fixture(t),parent=path.join(f.root,'blocked');
  const power=await f.create(path.join(parent,'power.json')).initialize();
  await fs.writeFile(parent,'synthetic obstruction');
  await assert.rejects(power.set(false));
  assert.equal(power.enabled,true);assert.equal(f.active.size,1);
  await fs.unlink(parent);
  await power.set(false);
  assert.equal(f.active.size,0);assert.equal(JSON.parse(await fs.readFile(power.file,'utf8')).preventSleepWhileRunning,false);
});

test('shutdown rejects queued changes and cannot reacquire a blocker',async t=>{
  const f=await fixture(t),power=await f.create().initialize();
  const queued=power.set(false);
  const rejected=assert.rejects(queued,/退出/);
  await power.dispose();await rejected;
  await assert.rejects(power.set(true),/退出/);
  assert.equal(f.active.size,0);assert.deepEqual(await fs.readdir(f.root),[]);
});

test('malformed saved state is rejected without overwriting it',async t=>{
  const f=await fixture(t),power=f.create();
  const original='{"preventSleepWhileRunning":"false"}';
  await fs.writeFile(power.file,original);
  await assert.rejects(power.initialize(),/格式/);
  assert.equal(f.active.size,0);assert.equal(await fs.readFile(power.file,'utf8'),original);
});
