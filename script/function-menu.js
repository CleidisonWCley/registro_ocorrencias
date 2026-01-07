(function(){
      const menuBtn = document.getElementById('menuToggle');
      const mobileMenu = document.getElementById('mobileMenu');
      const navHtml = document.querySelector('.nav').innerHTML;

      menuBtn.addEventListener('click', function(){
        if(mobileMenu.style.display === 'block') {
            mobileMenu.style.display = 'none';
        } else {
            mobileMenu.style.display = 'block';
            mobileMenu.innerHTML = navHtml + '<div style="margin-top:15px; border-top:1px solid rgba(255,255,255,0.2); padding-top:15px"><a class="btn secondary" href="perfil.html" style="margin-bottom:10px">PERFIL</a><a class="btn primary" href="admin.html">LOGIN</a></div>';
        }
      });
})();