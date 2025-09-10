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

      // initialize checkbox options
      function initCheckboxes() {
        const checkboxes = document.querySelectorAll('#checkbox-options input[type="checkbox"]');
        const checkboxOptions = [
          {
            id: 'dontAllowTracking',
            label: '禁止网站使用 Web 分析工具跟踪用户行为',
            storage: 'umami.disabled',
            default: 'false'
          },
          {
            id: 'hideBatrick',
            label: '隐藏 Batrick（返回顶部按钮）',
            storage: 'geedeapro.ui.hideBatrick',
            default: 'false'
          }
        ]

        checkboxOptions.forEach(checkboxOption => {
          // create checkbox
          const element = document.createElement('input');
          element.type = 'checkbox';
          element.id = checkboxOption.id;
          element.checked = checkboxOption.default;

          // create label
          const label = document.createElement('label');
          label.htmlFor = element.id;
          label.textContent = checkboxOption.label;

          // wrap checkbox and label in a div
          const wrapper = document.createElement('div');
          wrapper.classList.add('flex', 'items-center', 'mb-2', 'gap-2');
          wrapper.appendChild(element);
          wrapper.appendChild(label);

          // add event listener to checkbox
          element.addEventListener('change', () => {
            localStorage.setItem(checkboxOption.storage, element.checked);
          });

          // append checkbox and label to container
          const container = document.getElementById('checkbox-options');
          container.appendChild(wrapper);
        });
      }
      initCheckboxes();
    };

    initializeSettingsPage();
})();
