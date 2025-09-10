(() => {
  /**
   * ===========
   * Font Size
   * ===========
   */

   const setFontSize = (size) => {
     if (size) localStorage.setItem('fontSize', size);
     const fontSizeSelected = size || localStorage.getItem('fontSize') || 'medium';

     const markdownBodies = document.querySelectorAll('.markdown-body');

     const fontSizeClass = {
       'small': ['text-size-sm', 'md:text-size-base'],
       'medium': ['text-size-lg', 'md:text-size-xl'],
       'large': ['text-size-xl', 'md:text-size-2xl']
     }

     markdownBodies.forEach((body) => {
       // remove existing font size classes
       body.classList.remove(...fontSizeClass['small'],
         ...fontSizeClass['medium'],
         ...fontSizeClass['large'])
       // add required font classes
       body.classList.add(...fontSizeClass[fontSizeSelected])
     });
   }
   setFontSize();

   /**
    * ===========================
    * Initialize Settings Page
    * ===========================
    */

    // return if this is not the settings page
    if (!document.getElementById('settings')) return;

    const initializeSettingsPage = () => {
      // initialize text altering buttons
      function initTextAlterButtons() {
        const textAlterButtons = document.querySelectorAll('#text-alter-buttons button');
        textAlterButtons.forEach(button => {
          // highlight selected button
          if (button.dataset.textSize === localStorage.getItem('fontSize')) {
            button.classList.add('bg-neutral-200/50');
          }

          // switch font size when clicked
          button.addEventListener('click', () => {
            setFontSize(button.dataset.textSize);
            // highlight selected button
            textAlterButtons.forEach(btn => btn.classList.remove('bg-neutral-200/50'));
            button.classList.add('bg-neutral-200/50');
          });
        });
      }
      initTextAlterButtons()

      //...
    };

    initializeSettingsPage();
})();
