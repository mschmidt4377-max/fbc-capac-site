(function(){
  var b=document.querySelector('.burger');
  if(b){
    b.addEventListener('click',function(){
      var open=document.body.classList.toggle('menu-open');
      b.setAttribute('aria-expanded',open);
      document.documentElement.style.overflow=open?'hidden':'';
    });
    document.querySelectorAll('.mobile-menu a').forEach(function(a){
      a.addEventListener('click',function(){document.body.classList.remove('menu-open');document.documentElement.style.overflow='';});
    });
  }
  document.querySelectorAll('.event-carousel').forEach(function(c){
    var list=c.querySelector('.event-list'),prev=c.querySelector('.prev'),next=c.querySelector('.next');
    if(!list)return;
    function step(){var card=list.querySelector('.event-card');return card?card.getBoundingClientRect().width+20:200;}
    function upd(){if(prev)prev.disabled=list.scrollLeft<=2;if(next)next.disabled=list.scrollLeft+list.clientWidth>=list.scrollWidth-2;}
    if(prev)prev.addEventListener('click',function(){list.scrollBy({left:-step(),behavior:'smooth'});});
    if(next)next.addEventListener('click',function(){list.scrollBy({left:step(),behavior:'smooth'});});
    list.addEventListener('scroll',upd);upd();
  });
})();
