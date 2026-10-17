// Small visual-only boost for text drawn on the lucky wheel.
// Loaded after history-restore-v4.js so the combined size is about 28% above the original.
(function(){
  if(window.__luckyWheelTextBoostV5)return;
  window.__luckyWheelTextBoostV5=true;

  const proto=CanvasRenderingContext2D.prototype;
  const previousFillText=proto.fillText;
  const previousStrokeText=proto.strokeText;
  const factor=1.13;

  function withBoost(ctx,draw){
    if(ctx.canvas?.id!=='wheel')return draw();
    const original=ctx.font;
    const match=original.match(/(\d+(?:\.\d+)?)px/);
    if(!match)return draw();
    const size=Number(match[1]);
    if(!Number.isFinite(size)||size<=0)return draw();
    ctx.font=original.replace(match[0],`${Math.round(size*factor*10)/10}px`);
    try{return draw();}
    finally{ctx.font=original;}
  }

  proto.fillText=function(...args){
    return withBoost(this,()=>previousFillText.apply(this,args));
  };

  proto.strokeText=function(...args){
    return withBoost(this,()=>previousStrokeText.apply(this,args));
  };
})();
