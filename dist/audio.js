// Original classroom melodies and sound effects synthesized locally.
const melodies = {
  playful: {tempo: .32, notes:[72,76,79,76,74,77,81,77,76,79,84,79,77,76,74,72,72,76,79,84,81,79,77,76,74,77,79,77,76,74,72,0], wave:'triangle'},
  dreamy: {tempo: .52, notes:[72,0,79,76,74,0,81,77,76,0,84,79,77,0,81,79,76,0,79,72,74,0,77,71,72,0,76,79,72,0,0,0],wave:'sine'},
  bouncy: {tempo: .27,notes:[72,72,79,0,76,76,81,0,77,77,79,76,74,0,72,0,79,79,84,0,81,81,79,0,77,76,74,77,76,74,72,0],wave:'triangle'}
};
export class ClassroomAudio {
  constructor(report) { this.report=report;this.enabled=true;this.volume=.45;this.musicOn=false;this.track='playful';this.nodes=new Set();this.musicNodes=new Set();this.custom=null;this.timer=null;this.note=0; }
  async unlock() {
    try {
      if (!this.ctx) {
        const AC=window.AudioContext||window.webkitAudioContext;
        if(!AC){this.report('Trình duyệt này chưa hỗ trợ âm thanh. Vòng quay vẫn sử dụng bình thường.');return false;}
        this.ctx=new AC();this.master=this.ctx.createGain();this.master.connect(this.ctx.destination);this.master.gain.value=this.enabled?this.volume:0;
      }
      if(this.ctx.state==='suspended') await this.ctx.resume();
      return true;
    } catch { this.report('Chưa phát được âm thanh. Thầy cô có thể bật lại bằng nút Âm thanh.');return false; }
  }
  setVolume(v){this.volume=v;if(this.master)this.master.gain.setTargetAtTime(this.enabled?v:0,this.ctx.currentTime,.025);if(this.custom)this.custom.volume=v*.6;}
  setEnabled(on){this.enabled=on;this.setVolume(this.volume);this.syncMusic();}
  tone(midi,duration=.15,delay=0,volume=.12,type='sine',music=false){
    if(!this.ctx||!this.enabled)return;
    const oscillator=this.ctx.createOscillator(),gain=this.ctx.createGain(),start=this.ctx.currentTime+delay;
    oscillator.type=type;oscillator.frequency.value=440*2**((midi-69)/12);gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(volume,start+.008);gain.gain.exponentialRampToValueAtTime(.0001,start+duration);oscillator.connect(gain);gain.connect(this.master);oscillator.start(start);oscillator.stop(start+duration+.03);
    this.nodes.add(oscillator);if(music)this.musicNodes.add(oscillator);
    oscillator.onended=()=>{this.nodes.delete(oscillator);this.musicNodes.delete(oscillator);gain.disconnect();oscillator.disconnect();};
  }
  click(){this.tone(76,.06,0,.12,'triangle');this.tone(84,.06,.05,.09,'triangle');}
  tick(){this.tone(92,.027,0,.065,'triangle');}
  spin(){[60,64,67,72].forEach((n,i)=>this.tone(n,.13,i*.075,.07,'triangle'));}
  stop(){this.tone(60,.09,0,.13,'triangle');}
  result(complete=false){const seq=complete?[72,76,79,84,79,84,88]:[72,76,79,84];seq.forEach((n,i)=>this.tone(n,.5,.1+i*.115,.12,'triangle'));if(complete)[60,64,67,72].forEach(n=>this.tone(n,1.15,.9,.035));}
  stopMusic(){clearInterval(this.timer);this.timer=null;for(const node of this.musicNodes){try{node.stop();}catch{}}this.musicNodes.clear();if(this.custom)this.custom.pause();}
  async syncMusic(){
    this.stopMusic();if(!this.musicOn||!this.enabled)return;if(!await this.unlock())return;
    if(this.track==='custom'&&this.custom){this.custom.loop=true;this.custom.volume=this.volume*.6;this.custom.play().catch(()=>this.report('Hãy bấm bật nhạc nền để phát nhạc đã chọn.'));return;}
    const song=melodies[this.track]||melodies.playful;this.note=0;
    const schedule=()=>{const n=song.notes[this.note%song.notes.length];if(n)this.tone(n,song.tempo*.8,0,.07,song.wave,true);if(this.note%4===0)this.tone([48,53,55,48][Math.floor(this.note/8)%4],song.tempo*2.7,0,.03,'sine',true);this.note++;};schedule();this.timer=setInterval(schedule,song.tempo*1000);
  }
  setCustom(file){if(this.custom){this.custom.pause();URL.revokeObjectURL(this.custom.src);}this.custom=new Audio(URL.createObjectURL(file));this.custom.onerror=()=>this.report('Không đọc được tệp nhạc này. Hãy thử tệp MP3, WAV hoặc OGG khác.');}
  setCustomURL(url){if(this.custom){this.custom.pause();if(this.custom.src.startsWith('blob:'))URL.revokeObjectURL(this.custom.src);}this.custom=new Audio(url);this.custom.preload='none';this.custom.onerror=()=>this.report('Không mở được link nhạc. Hãy dùng đường dẫn HTTPS công khai tới tệp âm thanh.');}
  pause(){this.stopMusic();if(this.ctx)this.ctx.suspend().catch(()=>{});}
}

export async function savedMusic(file) {
  if(!window.indexedDB) return null;
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open('lucky-classroom-audio',1);
    req.onupgradeneeded=()=>req.result.createObjectStore('music');
    req.onerror=()=>reject(req.error);
    req.onsuccess=()=>{const db=req.result,tx=db.transaction('music',file?'readwrite':'readonly'),store=tx.objectStore('music');const operation=file?store.put(file,'custom'):store.get('custom');let value=null;operation.onsuccess=()=>value=operation.result;tx.oncomplete=()=>{db.close();resolve(value);};tx.onerror=()=>{db.close();reject(tx.error);};};
  });
}
