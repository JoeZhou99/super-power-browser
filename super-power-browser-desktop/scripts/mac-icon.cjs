const fs=require('node:fs');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
if(process.platform!=='darwin')throw new Error('Build the macOS installer on a Mac.');
const root=path.resolve(__dirname,'..'),folder=fs.mkdtempSync(path.join(require('node:os').tmpdir(),'spb-icon-'));
try{
  const icons=path.join(folder,'app.iconset');fs.mkdirSync(icons);
  for(const size of [16,32,128,256,512])for(const scale of [1,2]){
    const output=path.join(icons,`icon_${size}x${size}${scale===2?'@2x':''}.png`);
    execFileSync('/usr/bin/sips',['-z',String(size*scale),String(size*scale),path.join(root,'branding/icon-256.png'),'--out',output],{stdio:'ignore'});
  }
  execFileSync('/usr/bin/iconutil',['-c','icns',icons,'-o',path.join(root,'branding/app.icns')]);
}finally{fs.rmSync(folder,{recursive:true,force:true});}
