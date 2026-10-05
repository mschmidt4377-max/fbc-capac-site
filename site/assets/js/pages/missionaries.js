(function(){
  var track=document.querySelector('.track');
  if(!track)return;
  var slides=track.querySelectorAll('.slide:not(.clone)');
  var clone=track.querySelector('.clone');
  var n=slides.length,idx=0;
  function mobile(){return window.matchMedia('(max-width:900px)').matches}
  function render(anim){
    track.style.transition=anim?'':'none';
    var w=slides[0].getBoundingClientRect().width;
    var gap=parseFloat(getComputedStyle(track).columnGap)||0;
    var step=w+gap,x;
    if(mobile()){clone.style.display='none';x=-idx*step}
    else{clone.style.display='';x=window.innerWidth*0.0403-(idx+1)*step}
    track.style.transform='translateX('+x+'px)';
  }
  function go(d){idx=(idx+d+n)%n;render(true)}
  document.querySelectorAll('.arrow-prev').forEach(function(b){b.addEventListener('click',function(){go(-1)})});
  document.querySelectorAll('.arrow-next').forEach(function(b){b.addEventListener('click',function(){go(1)})});
  window.addEventListener('resize',function(){render(false)});
  render(false);
})();
