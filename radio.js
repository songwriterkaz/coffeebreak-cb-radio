/* © Karen O'Brien (Coffeebreak). All rights reserved. */
(function(){
var $=function(s){return document.querySelector(s)},P='cbcb-',q=CB.q,BASE=CB.BASE;
function clean(n,l){return String(n||'').toLowerCase().replace(/[^a-z0-9]/g,'').slice(0,l||20)}
var me=clean(q.get('me'))||clean(localStorage.getItem(P+'me')),ch=clean(q.get('ch'),16)||clean(localStorage.getItem(P+'ch'),16);
var sig,myId,on=false,talking=false,spk=true,granted=false,links=new Map(),mem={},es,hereT,actx;window.cbStat={v:CB.V};
function st(t,ok){$('#st').textContent=t;$('#st').className=ok?'ok':''}
function note(t){$('#note').textContent=t||''}
function isPub(c){return /^c([1-9]|[1-3][0-9]|40)$/.test(c)}
function chName(){return isPub(ch)?'Channel '+ch.slice(1):'Private channel'}
function link(id){var L=links.get(id);if(!L){L=new CB.Link(sig,id,{onopen:onopen,onclose:ui,onmsg:onmsg,ontrack:ontrack});links.set(id,L)}return L}
function member(id){return mem[id]||(mem[id]={name:'',talk:false,seen:Date.now()})}
function onopen(L){var m=member(L.r);m.name=L.rname||m.name;m.seen=Date.now();if(!cbStat.joinMs)cbStat.joinMs=Math.round(L.tOpen-CB.T0);L.tx({k:'talk',on:talking});ui()}
function onmsg(L,m){var x=member(L.r);x.seen=Date.now();if(m.k=='hi')x.name=m.name;else if(m.k=='talk'){x.talk=!!m.on;if(x.talk)x.tTalk=performance.now()}ui()}
function ontrack(L){var a=L.au;if(!a){a=L.au=document.createElement('audio');a.autoplay=true;a.setAttribute('playsinline','');a.className='hide';document.body.appendChild(a)}a.srcObject=L.stream;CB.setSink(a);a.volume=spk?1:0.4;a.play().catch(function(){})}
function onSig(m){if(m.f==myId)return;var L=link(m.f);if(m.k=='hello'||m.k=='offer'){member(m.f).seen=Date.now()}L.onMsg(m)}
function onPresence(m){if(!m||m.f==myId||!on)return;if(m.k=='gone'){drop(m.f);ui();return}if(m.k!='here')return;var x=member(m.f);x.name=m.name||x.name;x.seen=Date.now();var L=link(m.f);L.want=true;L.tick();ui()}
function drop(id){var L=links.get(id);if(L){L.close();if(L.au)L.au.remove();links.delete(id)}delete mem[id]}
function here(){if(on)sig.send(null,{k:'here',name:me},P+'ch-'+ch)}
function start(){if(on)return;on=true;localStorage.setItem(P+'ch',ch);history.replaceState(null,'',BASE+'?ch='+ch+'&me='+me);
 myId=ch+'-'+CB.rnd(5);sig=new CB.Sig(P,myId,onSig);sig.onup=function(){links.forEach(function(L){L.tick()});ui()};sig.start();
 es=new EventSource('https://ntfy.sh/'+P+'ch-'+ch+'/sse?since=30s');es.onopen=function(){here()};es.onmessage=function(e){try{onPresence(JSON.parse(JSON.parse(e.data).message))}catch(x){}};
 here();clearInterval(hereT);hereT=setInterval(here,8000);$('#onoff').textContent='Radio on';$('#onoff').classList.remove('on');drawQR();ui()}
function stop(){if(!on)return;if(talking)toggle();sig.send(null,{k:'gone'},P+'ch-'+ch);on=false;clearInterval(hereT);try{es.close()}catch(e){}sig.stop();Object.keys(mem).forEach(drop);links.forEach(function(L,id){drop(id)});$('#onoff').textContent='Radio off';$('#onoff').classList.add('on');ui()}
setInterval(function(){if(!on)return;var now=Date.now();Object.keys(mem).forEach(function(id){var L=links.get(id);if(now-mem[id].seen>25000&&!(L&&L.open))drop(id)});links.forEach(function(L){L.tick()});ui()},1500);
function mic(g){if(CB.track&&CB.track.readyState=='live')return Promise.resolve(CB.track);if(!g&&!granted)return Promise.reject();
 return navigator.mediaDevices.getUserMedia({audio:CB.micC()}).then(function(s){var t=s.getAudioTracks()[0];t.enabled=talking;CB.track=t;granted=true;links.forEach(function(L){L.setTrack(t)});return t})}
if(navigator.permissions&&navigator.permissions.query)navigator.permissions.query({name:'microphone'}).then(function(p){if(p.state=='granted'){granted=true;mic().catch(function(){})}}).catch(function(){});
function unlock(){try{if(!actx)actx=new (window.AudioContext||window.webkitAudioContext)();if(actx.state=='suspended')actx.resume()}catch(e){}links.forEach(function(L){if(L.au)L.au.play().catch(function(){})})}
function beep(up){try{unlock();var t=actx.currentTime,o=actx.createOscillator(),g=actx.createGain();o.type='sine';o.frequency.value=up?880:660;g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(0.08,t+0.02);g.gain.exponentialRampToValueAtTime(0.0001,t+0.12);o.connect(g).connect(actx.destination);o.start(t);o.stop(t+0.13)}catch(e){}}
function toggle(){talking=!talking;if(CB.track)CB.track.enabled=talking;beep(talking);links.forEach(function(L){L.tx({k:'talk',on:talking})});
 var busy=talking&&Object.keys(mem).some(function(id){return mem[id].talk});note(busy?'Someone else is talking too':'');ui()}
$('#talk').onclick=function(){unlock();if(!on){note('Turn the radio on first');return}if(!talking&&!(CB.track&&CB.track.readyState=='live')){mic(true).then(function(){toggle()}).catch(function(){note('Allow the microphone')});return}toggle()};
$('#onoff').onclick=function(){unlock();on?stop():start()};
$('#spk').onclick=function(){spk=!spk;links.forEach(function(L){if(L.au)L.au.volume=spk?1:0.4});this.textContent=spk?'Speaker on':'Speaker off';this.classList.toggle('on',!spk)};
$('#chsel').onchange=function(){var v=this.value,wasOn=on;stop();ch=v=='p'?(localStorage.getItem(P+'priv')||CB.rnd(8)):v;if(v=='p')localStorage.setItem(P+'priv',ch);$('#pubnote').classList.toggle('hide',v=='p');if(wasOn||true)start()};
$('#share').onclick=function(){var u=BASE+'?ch='+ch;if(navigator.share)navigator.share({title:'Join my Coffeebreak radio',url:u}).catch(function(){});else (navigator.clipboard?navigator.clipboard.writeText(u):Promise.reject()).then(function(){note('Link copied')}).catch(function(){prompt('Copy this',u)})};
function ui(){var t=$('#talk');t.classList.toggle('on',talking);t.textContent=talking?'Talking':'TALK';$('#tip').textContent=talking?'Tap again to listen':'Tap to talk';
 var ids=Object.keys(mem),lst=$('#who');lst.innerHTML='';var n=0,tk=[];
 ids.forEach(function(id){var L=links.get(id),x=mem[id];if(!(L&&L.open))return;n++;var d=document.createElement('span');d.className='m'+(x.talk?' lit':'');d.textContent=(x.talk?'🔊 ':'')+(x.name||'Someone');lst.appendChild(d);if(x.talk)tk.push(x.name||'Someone')});
 $('#chn').textContent=chName();
 if(!on)st('Radio off');else if(!sig.isUp())st('Going online');else if(talking)st('You are talking',true);else if(tk.length)st(tk.join(' and ')+' talking',true);else if(n)st(n+(n==1?' other person':' others')+' here',true);else if(ids.length)st('Joining');else st('On air. Waiting for others',true);
 if(talking&&!tk.length&&$('#note').textContent=='Someone else is talking too')note('')}
function drawQR(){var t=setInterval(function(){if(window.QRCode){clearInterval(t);$('#qr').innerHTML='';new QRCode($('#qr'),{text:BASE+'?ch='+ch,width:120,height:120,colorDark:'#7a1f48'})}},150)}
window.cbLevels=function(){if(!actx)actx=new AudioContext();var o={};links.forEach(function(L,id){if(!L.stream)return;if(!L.an){var s=actx.createMediaStreamSource(L.stream),a=actx.createAnalyser();a.fftSize=1024;s.connect(a);L.an=a}var b=new Float32Array(1024);L.an.getFloatTimeDomainData(b);var r=0;for(var i=0;i<b.length;i++)r+=b[i]*b[i];o[(mem[id]&&mem[id].name)||id]=Math.sqrt(r/b.length)});return o};
window.cbDebug=function(){return {on:on,talking:talking,me:me,ch:ch,ntfy:sig&&sig.up.ntfy,pj:sig&&sig.up.pj,members:Object.keys(mem).map(function(id){var L=links.get(id);return (mem[id].name||'?')+':'+(L&&L.open?'open':'-')+(L&&L.via?':'+L.via:'')+(mem[id].talk?':talk':'')}),st:$('#st').textContent}};
var sel=$('#chsel');for(var i=1;i<=40;i++){var o=document.createElement('option');o.value='c'+i;o.textContent='Channel '+i;sel.appendChild(o)}
function go(){localStorage.setItem(P+'me',me);if(!ch){ch=CB.rnd(8);localStorage.setItem(P+'priv',ch)}else if(!isPub(ch)&&!localStorage.getItem(P+'priv'))localStorage.setItem(P+'priv',ch);
 sel.value=isPub(ch)?ch:'p';$('#pubnote').classList.toggle('hide',!isPub(ch));$('#setup').classList.add('hide');$('#app').classList.remove('hide');$('#me').textContent='You are '+me;CB.myName=me;start();CB.awake()}
document.addEventListener('visibilitychange',function(){if(document.hidden)return;CB.awake();CB.checkVersion();if(on){sig.revive(true);if(es.readyState==2){on=false;start()}here();links.forEach(function(L){if(!L.open){L.lastTry=0;L.tick()}})}});
$('#devb').onclick=function(){$('#pDev').classList.toggle('hide');mic(true).catch(function(){}).then(function(){CB.fillDev(function(old){mic(true).then(function(t){t.enabled=talking;if(old)old.stop()}).catch(function(){CB.track=old})})})};
CB.keys(function(){$('#talk').click()},function(){$('#spk').click()});
CB.checkVersion();
if(!me){$('#setup').classList.remove('hide');$('#nm').focus()}else go();
$('#start').onclick=function(){me=clean($('#nm').value);if(!me){$('#nm').focus();return}go()};
$('#nm').onkeydown=function(e){if(e.key=='Enter')$('#start').click()};
})();
