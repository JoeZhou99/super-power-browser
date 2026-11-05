// Original two-note notification, generated locally without a media player.
const fs=require('node:fs');
const path=require('node:path');
module.exports=function writeNotification(directory){
  const rate=22050,samples=Math.round(rate*0.6),data=Buffer.alloc(44+samples*2);
  data.write('RIFF',0);data.writeUInt32LE(data.length-8,4);data.write('WAVEfmt ',8);data.writeUInt32LE(16,16);
  data.writeUInt16LE(1,20);data.writeUInt16LE(1,22);data.writeUInt32LE(rate,24);data.writeUInt32LE(rate*2,28);data.writeUInt16LE(2,32);data.writeUInt16LE(16,34);data.write('data',36);data.writeUInt32LE(samples*2,40);
  for(let i=0;i<samples;i++){const t=i/rate,n=t<0.25?t:t-0.3,frequency=t<0.25?660:880;
    const amplitude=n>=0&&n<0.25?Math.min(1,n/0.015)*Math.max(0,1-n/0.25)*0.16:0;
    data.writeInt16LE(Math.round(Math.sin(2*Math.PI*frequency*n)*amplitude*32767),44+i*2);
  }
  fs.mkdirSync(directory,{recursive:true});fs.writeFileSync(path.join(directory,'notification.wav'),data);
};
