(function() {
  // --- DOM Elements ---
  // Declare variables for frequently accessed DOM elements
  let mainTitleEl, dotEconGovt, dotDiplScty,
      questionLabel, questionTitle, answersContainer, answerButtons,
      answerAnnotations, resultsArea, ideologyResultEl, resultsTitleEl,
      languageSelectEl, // Variable for the language dropdown
      backButton, prevButton, loadingErrorEl, htmlEl, metaDescriptionEl,
      tipEquality, tipMarket, tipNation, tipGlobe, tipLiberty, tipAuthority, tipTradition, tipProgress,
      answersWrapperEl,
      // Bar elements for results
      barEquality, barMarket, barNation, barGlobe, barLiberty, barAuthority, barTradition, barProgress,
      // Text elements inside result bars
      valEquality, valMarket, valNation, valGlobe, valLiberty, valAuthority, valTradition, valProgress,
      // Axis label elements for results (e.g., "Communist", "Capitalist")
      labelEcon, labelDipl, labelGovt, labelScty;


  // Function to get references to DOM elements after the page loads
  function getDOMElements() {
      mainTitleEl = document.getElementById('main-title');
      dotEconGovt = document.getElementById('dot-econ-govt'); // Target dot on the first chart
      dotDiplScty = document.getElementById('dot-dipl-scty'); // Target dot on the second chart
      questionLabel = document.getElementById('question-label'); // "Question x / y"
      questionTitle = document.getElementById('question-title'); // The actual question text
      answersContainer = document.getElementById('answers'); // Container for answer buttons
      answersWrapperEl = document.getElementById('answers-container'); // Wrapper including prev button
      answerButtons = document.querySelectorAll('.answer'); // All answer buttons
      answerAnnotations = document.querySelectorAll('.answer-annotation'); // Text below answer buttons
      resultsArea = document.getElementById('results-area'); // The whole results section
      ideologyResultEl = document.getElementById('ideology-result'); // H1 showing the matched ideology
      resultsTitleEl = document.getElementById('resultsTitle'); // "Your closest match:" text
      languageSelectEl = document.getElementById('language-select'); // Get the language dropdown
      backButton = document.getElementById('back-button'); // "Back to Start" button
      prevButton = document.getElementById('prev-button'); // "Back" (previous question) button
      loadingErrorEl = document.getElementById('loading-error'); // Element to display errors
      htmlEl = document.documentElement; // The <html> element (for lang attribute)
      metaDescriptionEl = document.getElementById('meta-description'); // Meta description tag
      // Get tooltip trigger elements
      tipEquality = document.getElementById('tip-equality');
      tipMarket = document.getElementById('tip-market');
      tipNation = document.getElementById('tip-nation');
      tipGlobe = document.getElementById('tip-globe');
      tipLiberty = document.getElementById('tip-liberty');
      tipAuthority = document.getElementById('tip-authority');
      tipTradition = document.getElementById('tip-tradition');
      tipProgress = document.getElementById('tip-progress');
      // Get result bar elements
      barEquality = document.getElementById('bar-equality');
      barMarket = document.getElementById('bar-market');
      barNation = document.getElementById('bar-nation');
      barGlobe = document.getElementById('bar-globe');
      barLiberty = document.getElementById('bar-liberty');
      barAuthority = document.getElementById('bar-authority');
      barTradition = document.getElementById('bar-tradition');
      barProgress = document.getElementById('bar-progress');
      // Get result bar value text elements
      valEquality = document.getElementById('equality-val');
      valMarket = document.getElementById('market-val');
      valNation = document.getElementById('nation-val');
      valGlobe = document.getElementById('globe-val');
      valLiberty = document.getElementById('liberty-val');
      valAuthority = document.getElementById('authority-val');
      valTradition = document.getElementById('tradition-val');
      valProgress = document.getElementById('progress-val');
      // Get result axis label elements
      labelEcon = document.getElementById('economic-label');
      labelDipl = document.getElementById('diplomatic-label');
      labelGovt = document.getElementById('civil-label');
      labelScty = document.getElementById('societal-label');
  }


  // --- State Variables ---
  let currentQuestionIndex = 0; // Tracks the current question number
  let questions = []; // Stores all questions from config/questions.json
  let shuffledQuestions = []; // Stores questions in a random order for the quiz
  let ideologies = []; // Stores all ideologies from config/ideologies.json
  let currentLang = 'en'; // Tracks the currently selected language
  let localeData = {}; // Stores the loaded language strings
  let userAnswers = {}; // Stores the user's cumulative scores for each axis
  let scoreHistory = []; // Stores previous score states to allow going back
  const maxScores = { econ: 0, dipl: 0, govt: 0, scty: 0 }; // Stores the maximum possible absolute score for each axis
  let availableLanguages = []; // Stores codes of languages with available locale files

  // --- Configuration ---
  // Define supported languages and their display names
  // Add or remove languages here as needed. The code will check if the corresponding .json file exists.
  const supportedLanguages = [
      { code: 'en', name: 'English' },
      { code: 'zh', name: '中文' },
      { code: 'es', name: 'Español' },
      { code: 'pt', name: 'Português' }
      // Add more languages here, e.g.: { code: 'fr', name: 'Français' }
  ];

  // --- Constants for scoring ---
  // Maps button data-value attributes to numerical multipliers
  const answerValues = {
    '1.0': 1.0,  // Strongly Agree
    '0.5': 0.5,  // Agree
    '0.0': 0.0,  // Neutral
    '-0.5': -0.5, // Disagree
    '-1.0': -1.0  // Strongly Disagree
  };

  // --- Dynamic Language Dropdown Population ---
  async function populateLanguageDropdown() {
      if (!languageSelectEl) return;
      languageSelectEl.innerHTML = ''; // Clear existing options
      availableLanguages = []; // Reset the list of available languages

      // Create promises to check for each language file
      const checks = supportedLanguages.map(async (lang) => {
          try {
              const response = await fetch(`locales/${lang.code}.json`);
              if (response.ok) {
                  return lang; // Return the language object if file exists
              } else {
                  console.warn(`Locale file for ${lang.name} (${lang.code}.json) not found or failed to load (${response.status}).`);
                  return null;
              }
          } catch (error) {
              console.warn(`Error fetching locale file for ${lang.name} (${lang.code}.json):`, error);
              return null;
          }
      });

      // Wait for all checks to complete
      const results = await Promise.all(checks);

      // Populate dropdown with available languages
      results.forEach(lang => {
          if (lang) {
              availableLanguages.push(lang.code); // Add code to available list
              const option = document.createElement('option');
              option.value = lang.code;
              option.textContent = lang.name;
              languageSelectEl.appendChild(option);
          }
      });

      // Ensure English is always an option if available (as a fallback)
      if (!availableLanguages.includes('en')) {
          const enLang = supportedLanguages.find(l => l.code === 'en');
          if (enLang) {
             // If English wasn't found initially but is in supportedLanguages, try one more time
             try {
                const response = await fetch(`locales/en.json`);
                if (response.ok) {
                    availableLanguages.push('en');
                    const option = document.createElement('option');
                    option.value = 'en';
                    option.textContent = enLang.name;
                    languageSelectEl.appendChild(option); // Consider adding it first or last
                    console.log("Ensured English option is available.");
                }
             } catch (e) { /* Ignore error if English still fails */}
          }
      }
      // Ensure at least one option exists, default to English if dropdown is empty
      if (languageSelectEl.options.length === 0) {
          console.error("No language files found! Adding English as default.");
          const option = document.createElement('option');
          option.value = 'en';
          option.textContent = 'English';
          languageSelectEl.appendChild(option);
          availableLanguages.push('en');
      }


      console.log("Available languages detected:", availableLanguages);
  }


  // --- Initialization ---
  // This function runs when the page is fully loaded
  async function init() {
    getDOMElements(); // Get references to all needed elements
    // Basic check if essential elements exist
    if (!loadingErrorEl || !htmlEl || !languageSelectEl) {
        console.error("Essential DOM elements not found. Aborting.");
        alert("Error initializing page.");
        return;
    }
    showLoadingError(null); // Hide any previous error messages

    // --- Populate Language Dropdown Dynamically ---
    await populateLanguageDropdown(); // Wait for dropdown to be populated

    // --- Determine initial language ---
    // 1. Check localStorage
    let preferredLang = localStorage.getItem('preferredLang');
    // Ensure preferredLang from storage is actually available
    if (preferredLang && !availableLanguages.includes(preferredLang)) {
        preferredLang = null; // Reset if saved language is no longer available
        localStorage.removeItem('preferredLang');
    }

    // 2. Check browser language (navigator.language or navigator.languages)
    if (!preferredLang && navigator.language) {
        const browserLang = navigator.language.toLowerCase().split('-')[0];
        // Check if the browser language is in our *available* list
        if (availableLanguages.includes(browserLang)) {
            preferredLang = browserLang;
        }
    }
    // 3. Default to 'en' if available, otherwise the first available language
    currentLang = preferredLang || (availableLanguages.includes('en') ? 'en' : availableLanguages[0]);
    // --- End of Language Determination ---


    // Set the initial selected option in the dropdown *after* determining currentLang
    if (languageSelectEl) {
        languageSelectEl.value = currentLang;
    }

    try {
        // Load question/ideology data and the determined language's text
        await loadConfigAndLocale(currentLang);
        // Set up event listeners for buttons and dropdown
        setupEventListeners();
        // Start the quiz (shuffle questions, load the first one)
        startQuiz();
    } catch (error) {
        // Catch any errors during initialization
        console.error("Initialization failed:", error);
        showLoadingError(`Initialization failed: ${error.message}. Please try refreshing.`);
    }
  }

  // --- Show Loading/Error Message ---
  // Displays or hides the error message element
  function showLoadingError(message) {
      if (loadingErrorEl) {
          loadingErrorEl.style.display = message ? 'block' : 'none'; // Show if message exists, hide otherwise
          if(message) loadingErrorEl.textContent = message; // Set the error text
      } else {
          // Fallback if the error element itself is missing
          console.error("loading-error element not found.");
          if (message) alert(message); // Use alert as a last resort
      }
  }

  // --- Data Loading ---
  // Fetches questions.json, ideologies.json, and the specified locale file
  async function loadConfigAndLocale(lang) {
    console.log(`Loading config and locale for: ${lang}`);
    showLoadingError(`Loading data for ${lang}...`); // Show loading message
    try {
      // Fetch all three files concurrently
      const [questionsRes, ideologiesRes, localeRes] = await Promise.all([
        fetch('config/questions.json'),
        fetch('config/ideologies.json'),
        fetch(`locales/${lang}.json`) // Fetch the specific language file
      ]);

      // Check if fetches were successful
      if (!questionsRes.ok) throw new Error(`Questions fetch failed: ${questionsRes.status}`);
      if (!ideologiesRes.ok) throw new Error(`Ideologies fetch failed: ${ideologiesRes.status}`);
      if (!localeRes.ok) throw new Error(`Locale fetch failed for ${lang}: ${localeRes.status}`); // Improved error message

      // Parse JSON data
      questions = await questionsRes.json();
      ideologies = await ideologiesRes.json();
      localeData = await localeRes.json();

      // Update state and localStorage
      currentLang = lang;
      localStorage.setItem('preferredLang', lang);
      if (htmlEl) htmlEl.lang = lang; // Set lang attribute on <html> tag

       // Ensure dropdown reflects the newly loaded language (might be redundant now, but safe)
       if (languageSelectEl && languageSelectEl.value !== currentLang) {
           languageSelectEl.value = currentLang;
       }

      // Calculate maximum possible scores if not already done
      if (questions && questions.length > 0 && maxScores.econ === 0) {
          calculateMaxScores();
      } else if (!questions || questions.length === 0) {
          throw new Error("Questions data is empty."); // Handle case where questions are missing
      }

      applyTranslations(); // Update all text elements on the page
      console.log("Data loaded successfully:", { questions_count: questions.length, ideologies_count: ideologies.length, locale: lang });
      showLoadingError(null); // Hide loading message

    } catch (error) {
      // Handle errors during data loading
      console.error("Failed to load data:", error);
      // Try to fallback to English if the selected language failed AND English is available
      if (lang !== 'en' && availableLanguages.includes('en')) {
          console.warn(`Falling back to English due to error loading ${lang}.`);
          showLoadingError(`Error loading ${lang}, falling back to English.`);
          await loadConfigAndLocale('en'); // Attempt to load English instead
      } else {
          // If English itself failed or isn't available, show a critical error
          showLoadingError(`Critical Error: Failed to load base language data (${lang}): ${error.message}. Check network and file paths.`);
          // Potentially disable the quiz here?
          throw error; // Re-throw error to be caught by init()
      }
    }
  }

   // --- Calculate Max Scores ---
   // Determines the maximum possible absolute score deviation for each axis
   function calculateMaxScores() {
        maxScores.econ = 0; maxScores.dipl = 0; maxScores.govt = 0; maxScores.scty = 0;
        // Sum the absolute effect of each question on each axis
        questions.forEach(q => {
            if (q.effect) {
                maxScores.econ += Math.abs(q.effect.econ || 0);
                maxScores.dipl += Math.abs(q.effect.dipl || 0);
                maxScores.govt += Math.abs(q.effect.govt || 0);
                maxScores.scty += Math.abs(q.effect.scty || 0);
            }
        });
        // Prevent division by zero if an axis has no effect in any question
        for (const axis in maxScores) {
            if (maxScores[axis] === 0) maxScores[axis] = 1;
        }
        console.log("Max scores calculated:", maxScores);
   }

  // --- Language Switching ---
  // Called when the user selects a different language from the dropdown
  async function switchLanguage(lang) {
      if (lang === currentLang || !availableLanguages.includes(lang)) return; // Do nothing if same lang or lang not available
      console.log(`Switching language to: ${lang}`);
      try {
          // Fetch the new language file
          const localeRes = await fetch(`locales/${lang}.json`);
          if (!localeRes.ok) throw new Error(`Locale fetch failed for ${lang}: ${localeRes.status}`);
          localeData = await localeRes.json(); // Update locale data

          // Update state and localStorage
          currentLang = lang;
          localStorage.setItem('preferredLang', lang);
          if (htmlEl) htmlEl.lang = lang;

          // Ensure dropdown reflects the change (might be redundant)
          if (languageSelectEl && languageSelectEl.value !== currentLang) {
             languageSelectEl.value = currentLang;
          }

          applyTranslations(); // Update all text on the page

          // Dispatch a custom event so other scripts (like chart.js) know the language changed
          window.dispatchEvent(new CustomEvent('languageChanged', { detail: { localeData: localeData } }));

          // If the quiz is finished, re-render the results page in the new language
          if (shuffledQuestions && currentQuestionIndex >= shuffledQuestions.length) {
              showResults();
          }
          // If the quiz is in progress, reload the current question text
          else if (shuffledQuestions && shuffledQuestions.length > 0) {
              loadQuestion(currentQuestionIndex);
          }

          console.log(`Language switched to ${lang}`);
      } catch (error) {
          // Handle errors during language switching
          console.error(`Failed to switch language to ${lang}:`, error);
          showLoadingError(`Failed to switch language: ${error.message}. Check file exists.`);
          // Optionally, revert dropdown if switch fails?
          // if (languageSelectEl) languageSelectEl.value = currentLang; // Revert to previous lang
      }
  }

  // --- Translations ---
  // Updates the text content of various elements based on the loaded localeData
  function applyTranslations() {
      if (!localeData || Object.keys(localeData).length === 0) {
          console.warn("Locale data not available for translations.");
          return;
      }
      // Ensure elements are available
      if (!mainTitleEl) getDOMElements();

      // Update page title and meta description
      document.title = localeData.title || 'Political Compass Test';
      if (metaDescriptionEl && localeData.description) {
          metaDescriptionEl.setAttribute('content', localeData.description);
      } else if (metaDescriptionEl) {
          metaDescriptionEl.setAttribute('content', 'Take the 8values political compass test.');
      }

      // Update main heading
      if (mainTitleEl) mainTitleEl.innerText = localeData.mainTitle || "8values Test";

      // Update elements with data-i18n attribute
      document.querySelectorAll('[data-i18n]').forEach(el => {
          const key = el.getAttribute('data-i18n');
          el.innerText = localeData?.[key] ?? `Missing: ${key}`;
      });

      // Update elements with data-i18n-alt
       document.querySelectorAll('[data-i18n-alt]').forEach(el => {
            const keyPath = el.getAttribute('data-i18n-alt');
            const keys = keyPath.split('.');
            let translation = localeData;
            try { keys.forEach(k => { translation = translation[k]; }); } catch (e) { translation = null; }
            const img = el.querySelector('img');
            if (img) img.alt = translation ?? `Missing: ${keyPath}`;
            else el.title = translation ?? `Missing: ${keyPath}`;
       });

       // Update answer annotations
       if (answerAnnotations) {
           answerAnnotations.forEach(span => {
               const keyPath = span.getAttribute('data-i18n');
               if (!keyPath) return;
               const keys = keyPath.split('.');
               let translation = localeData;
                try { keys.forEach(k => { translation = translation[k]; }); } catch (e) { translation = null; }
                span.innerText = translation ?? `Missing: ${keyPath}`;
           });
       }

      // Update specific result/button texts
      if (resultsTitleEl && localeData.resultsTitle) resultsTitleEl.innerText = localeData.resultsTitle;
      if (backButton && localeData.backButton) backButton.innerText = localeData.backButton;
      if (prevButton && localeData.prevButton) prevButton.innerText = localeData.prevButton;

      // Update axis hover tips
      if (localeData.axisTips) {
          const tipElements = {
              tipEquality: tipEquality, tipMarket: tipMarket, tipNation: tipNation,
              tipGlobe: tipGlobe, tipLiberty: tipLiberty, tipAuthority: tipAuthority,
              tipTradition: tipTradition, tipProgress: tipProgress
          };
          for (const key in localeData.axisTips) {
              const element = tipElements[key];
              const tipText = localeData.axisTips[key];
              if (element) {
                  element.setAttribute('data-tooltip', tipText || '');
              }
          }
      } else {
          console.warn("localeData.axisTips object not found.");
      }

      // Update result axis titles
       document.querySelectorAll('[data-i18n^="axis"]').forEach(el => {
           const key = el.getAttribute('data-i18n');
           if (localeData[key]) {
               el.innerText = localeData[key];
           }
       });

       // Ensure dropdown value matches current language
       if (languageSelectEl && languageSelectEl.value !== currentLang) {
         languageSelectEl.value = currentLang;
       }

      console.log("Translations applied for language:", currentLang);
  }

  // --- Event Listeners ---
  // Sets up click/change handlers for interactive elements
  function setupEventListeners() {
    // Check for essential interactive elements
    if (!answerButtons || !languageSelectEl || !backButton || !prevButton) {
        console.error("Cannot set up listeners: one or more button/select elements not found.");
        return;
    }
    // Add click listeners to all answer buttons
    answerButtons.forEach(button => {
      button.removeEventListener('click', handleAnswerClick); // Prevent duplicate listeners
      button.addEventListener('click', handleAnswerClick);
    });

    // Add change listener to the language dropdown
    languageSelectEl.addEventListener('change', (event) => {
        // Call switchLanguage with the selected value
        switchLanguage(event.target.value);
    });

    // Add listeners for Back to Start and Previous Question buttons
    backButton.addEventListener('click', startQuiz);
    prevButton.addEventListener('click', prevQuestion);
  }

  // --- Fisher-Yates (Knuth) Shuffle ---
  // Shuffles an array in place
  function shuffleArray(array) {
      let currentIndex = array.length, randomIndex;
      while (currentIndex !== 0) {
          randomIndex = Math.floor(Math.random() * currentIndex);
          currentIndex--;
          [array[currentIndex], array[randomIndex]] = [
              array[randomIndex], array[currentIndex]];
      }
      return array;
  }

  // --- Quiz Logic ---
  // Resets the quiz state and starts it
  function startQuiz() {
    console.log("Starting or resetting quiz.");
    if (!answersWrapperEl) getDOMElements(); // Ensure elements are loaded

    resetQuizState(); // Clear scores, history, etc.

    // Create an array of objects, each containing the question data and its original index
    const questionsWithIndices = questions.map((q, index) => ({
        questionData: q, originalIndex: index
    }));
    // Shuffle this array
    shuffledQuestions = shuffleArray(questionsWithIndices);
    console.log("Questions shuffled.");

    currentQuestionIndex = 0; // Start from the first shuffled question
    window.location.hash = ''; // Clear any hash from previous results (optional)

    // Load the first question if questions exist
    if (shuffledQuestions && shuffledQuestions.length > 0) {
        loadQuestion(currentQuestionIndex);
        updateDots(); // Initialize dot positions
    } else {
        // Handle error if questions failed to load/shuffle
        console.error("Cannot start quiz: questions not loaded/shuffled.");
        showLoadingError("Error: Could not load questions.");
    }
  }

   // Resets scores, history, and UI elements to the initial state
   function resetQuizState() {
      currentQuestionIndex = 0;
      userAnswers = { econ: 0, dipl: 0, govt: 0, scty: 0 }; // Reset scores
      scoreHistory = []; // Clear history
      shuffledQuestions = []; // Clear shuffled questions

      // Hide results area, show answers area
      if (resultsArea) resultsArea.style.display = 'none';
      if (answersWrapperEl) answersWrapperEl.style.display = 'flex';
      if (prevButton) prevButton.style.display = 'none'; // Hide prev button initially

      // Reset dot positions and make them visible
      if (dotEconGovt) {
          dotEconGovt.style.display = 'flex';
          dotEconGovt.style.left = '50%'; dotEconGovt.style.top = '50%';
      }
      if (dotDiplScty) {
          dotDiplScty.style.display = 'flex';
          dotDiplScty.style.left = '50%'; dotDiplScty.style.top = '50%';
      }

      window.location.hash = ''; // Clear URL hash
      // Remove any 'selected' class from answer buttons (if used)
      if (answerButtons) answerButtons.forEach(btn => btn.classList.remove('selected'));
      console.log("Quiz state reset.");
   }

  // Loads and displays the question at the given index
  function loadQuestion(index) {
    // Check if necessary data and elements are available
    if (!shuffledQuestions || shuffledQuestions.length === 0 || !localeData?.questions || !questionLabel || !questionTitle || !answersWrapperEl || !resultsArea) {
        console.error("Cannot load question: missing data or elements.");
        showLoadingError("Error loading question.");
        if(answersWrapperEl) answersWrapperEl.style.display = 'none'; // Hide answers if error
        return;
    }
     // Handle index out of bounds (quiz finished)
     if (index < 0 || index >= shuffledQuestions.length) {
         if (index >= shuffledQuestions.length) showResults(); // Show results if past the last question
         return;
     }

    // Get the shuffled question item (contains original index and data)
    const currentShuffledItem = shuffledQuestions[index];
    const originalIndex = currentShuffledItem.originalIndex; // Needed to look up text in localeData
    const questionData = currentShuffledItem.questionData; // Contains the 'effect' object
    const questionKey = `q${originalIndex}`; // Key used in localeData.questions (e.g., "q0", "q1")

    // Get the translated question text, fallback to English text if translation missing
    const questionText = localeData.questions[questionKey] ?? (questions[originalIndex]?.question || "Question text missing"); // Fallback to original questions.json if locale fails
    // Format the "Question x / y" label
    const labelText = `${localeData.questionLabel || 'Question'} ${index + 1} / ${shuffledQuestions.length}`;

    // Update the DOM
    questionLabel.innerText = labelText;
    questionTitle.innerText = questionText;

    // Show/hide and enable/disable the "Back" button
    if (prevButton) {
        prevButton.style.display = (index > 0) ? 'inline-block' : 'none'; // Show only if not the first question
        prevButton.disabled = (index === 0);
    }

    // Ensure the correct sections are visible/hidden
    answersWrapperEl.style.display = 'flex';
    resultsArea.style.display = 'none';
    if (dotEconGovt) dotEconGovt.style.display = 'flex'; // Ensure dots are visible
    if (dotDiplScty) dotDiplScty.style.display = 'flex';
  }

  // Handles clicks on the answer buttons
  function handleAnswerClick(event) {
    const button = event.currentTarget; // The button that was clicked
    // Exit if quiz isn't ready or finished
    if (!button || !shuffledQuestions || currentQuestionIndex >= shuffledQuestions.length) return;

    // Get the answer value multiplier (-1.0 to 1.0) from the button's data attribute
    const valueStr = button.getAttribute('data-value');
    const answerValue = answerValues[valueStr];
    if (answerValue === undefined) return; // Exit if value is invalid

    // --- Store current score state before modification ---
    // Use structuredClone if available (deep copy), otherwise fallback to JSON parse/stringify
    const currentScoreState = typeof structuredClone === 'function'
                              ? structuredClone(userAnswers)
                              : JSON.parse(JSON.stringify(userAnswers));
    scoreHistory.push(currentScoreState); // Add previous state to history
    // ---

    // Get the current question's data and effects
    const currentShuffledItem = shuffledQuestions[currentQuestionIndex];
    const questionData = currentShuffledItem.questionData;
    // Basic check for question data integrity
    if (!questionData?.effect) {
        console.error(`Data issue for question index ${currentQuestionIndex}. Cannot calculate score.`);
        scoreHistory.pop(); // Remove the invalid state pushed earlier
        return;
    }

    // Apply the answer value multiplied by the question's effect to each axis score
    userAnswers.econ += answerValue * (questionData.effect.econ || 0);
    userAnswers.dipl += answerValue * (questionData.effect.dipl || 0);
    userAnswers.govt += answerValue * (questionData.effect.govt || 0);
    userAnswers.scty += answerValue * (questionData.effect.scty || 0);

    button.blur(); // Remove focus from the button
    updateDots(); // Update the position of the dots on the charts

    // Move to the next question or show results
    currentQuestionIndex++;
    if (currentQuestionIndex < shuffledQuestions.length) {
      loadQuestion(currentQuestionIndex);
    } else {
       showResults(); // Show results if all questions are answered
    }
  }

  // --- Previous Question Function ---
  // Called when the "Back" button is clicked
  function prevQuestion() {
      if (currentQuestionIndex <= 0) return; // Cannot go back from the first question
      console.log("Going back to previous question.");
      currentQuestionIndex--; // Decrement the question index

      // Restore the score state from history
      if (scoreHistory.length > 0) {
          userAnswers = scoreHistory.pop(); // Get the last saved state
          console.log("Score restored to:", JSON.stringify(userAnswers));
      } else {
          // Should not happen if button is correctly disabled, but good to check
          console.warn("Score history empty.");
      }
      // Load the previous question and update dots
      loadQuestion(currentQuestionIndex);
      updateDots();
  }

  // --- Update Dots Position ---
  // Calculates and sets the position of the target dots on the charts
  function updateDots() {
     // Check if elements and maxScores are ready
     if (!dotEconGovt || !dotDiplScty || !maxScores.econ || maxScores.econ <= 1) return;

     // Calculate current scores as percentages (0-100)
     // econ: 0=Equality, 100=Market | dipl: 0=Nation, 100=Globe
     // govt: 0=Authority, 100=Liberty | scty: 0=Tradition, 100=Progress
     // Formula: 50 (center) + 50 * (current_raw_score / max_possible_raw_score)
     const currentScores = {
         econ: 50 + 50 * (userAnswers.econ / maxScores.econ),
         dipl: 50 + 50 * (userAnswers.dipl / maxScores.dipl),
         govt: 50 + 50 * (userAnswers.govt / maxScores.govt),
         scty: 50 + 50 * (userAnswers.scty / maxScores.scty)
     };
     // Clamp scores between 0 and 100
     for (const axis in currentScores) {
        currentScores[axis] = Math.max(0, Math.min(100, currentScores[axis]));
     }

     // --- Calculate positions for Chart 1 (Econ/Govt) ---
     // Econ maps to X-axis (0=Left/Equality, 100=Right/Market)
     // Govt maps to Y-axis (0=Top/Authority, 100=Bottom/Liberty)
     // CSS left/top percentages range from 0% to 100%
     const positionX1 = (currentScores.econ / 100); // 0 to 1
     const positionY1 = (currentScores.govt / 100); // 0 to 1 (0=Top, 1=Bottom)
     dotEconGovt.style.left = positionX1 * 100 + '%';
     dotEconGovt.style.top = positionY1 * 100 + '%'; // CSS top increases downwards

     // --- Calculate positions for Chart 2 (Dipl/Scty) ---
     // Dipl maps to X-axis (0=Left/Nation, 100=Right/Globe)
     // Scty maps to Y-axis (0=Top/Tradition, 100=Bottom/Progress)
     const positionX2 = (currentScores.dipl / 100); // 0 to 1
     const positionY2 = (currentScores.scty / 100); // 0 to 1 (0=Top, 1=Bottom)
     dotDiplScty.style.left = positionX2 * 100 + '%';
     dotDiplScty.style.top = positionY2 * 100 + '%';
  }


  // --- Helper function to set bar width and text, hiding text if bar is too small ---
  function setBarValue(barElement, textElement, value) {
      if (!barElement || !textElement) return; // Ensure elements exist
      const percentage = parseFloat(value).toFixed(1); // Format to one decimal place
      // Clamp width between 0 and 100
      const widthPercentage = Math.max(0, Math.min(100, parseFloat(percentage)));
      barElement.style.width = widthPercentage + "%"; // Set bar width
      textElement.innerText = percentage + "%"; // Set text content

      // Use requestAnimationFrame to check dimensions after the browser has rendered the width change
      requestAnimationFrame(() => {
          if (!barElement || !textElement) return; // Re-check inside RAF
          // Hide text if it overflows the bar's current width
          if (textElement.offsetWidth + 10 > barElement.offsetWidth) { // Add some padding (10px)
              textElement.style.visibility = "hidden";
          } else {
              textElement.style.visibility = "visible";
          }
      });
  }

  // --- Helper function to get the descriptive axis label (e.g., "Socialist") based on score ---
  function getAxisLabel(score, axisType) {
      // Get the array of 7 labels for the specified axis type (econ, dipl, govt, scty)
      const labels = localeData?.axisLabels?.[axisType];
      if (!labels || labels.length !== 7) return ""; // Return empty if labels are missing

      const val = parseFloat(score); // Ensure score is a number
      // Determine the label based on score ranges (0-100)
      // Note: These ranges match the original 8values implementation.
      // Higher score (closer to 100) means closer to the "left/top" label (index 0).
      if (val > 100) { return ""; } // Should not happen with clamping
      else if (val >= 90) { return labels[0]; } // e.g., Communist
      else if (val >= 75) { return labels[1]; } // e.g., Socialist
      else if (val >= 60) { return labels[2]; } // e.g., Social
      else if (val >= 40) { return labels[3]; } // e.g., Centrist/Balanced/Moderate/Neutral
      else if (val >= 25) { return labels[4]; } // e.g., Market
      else if (val >= 10) { return labels[5]; } // e.g., Capitalist
      else if (val >= 0)  { return labels[6]; } // e.g., Laissez-Faire
      else { return ""; } // Default fallback
  }


  // --- Final Results ---
  // Calculates final scores, finds the closest ideology, and updates the UI
  function showResults() {
    console.log("Quiz complete. Calculating final results.");
    console.log("Final Raw Scores:", userAnswers);

     // Normalize raw scores to a 0-100 scale for each axis
     const finalScores = {
         econ: Math.max(0, Math.min(100, 50 + 50 * (userAnswers.econ / maxScores.econ))),
         dipl: Math.max(0, Math.min(100, 50 + 50 * (userAnswers.dipl / maxScores.dipl))),
         govt: Math.max(0, Math.min(100, 50 + 50 * (userAnswers.govt / maxScores.govt))),
         scty: Math.max(0, Math.min(100, 50 + 50 * (userAnswers.scty / maxScores.scty)))
     };
     console.log("Final Normalized Scores (0-100):", finalScores);

     // Calculate the opposing score for each axis (used for the bars)
     // e.g., Market = 100 - Equality
     const marketScore = (100 - finalScores.econ);
     const nationScore = (100 - finalScores.dipl);
     const authorityScore = (100 - finalScores.govt);
     const traditionScore = (100 - finalScores.scty);
     // Scores for the "left" side of the bars
     const equalityScore = finalScores.econ;
     const globeScore = finalScores.dipl;
     const libertyScore = finalScores.govt;
     const progressScore = finalScores.scty;

    // Find the ideology with the closest stats to the user's scores
    const closestIdeology = findClosestIdeology(finalScores);
    console.log("Closest Ideology Match:", closestIdeology);

    // --- Update UI to show results ---
    // Hide questions/answers, keep dots visible for context
    if (answersWrapperEl) answersWrapperEl.style.display = 'none';
    // if (dotEconGovt) dotEconGovt.style.display = 'none'; // Keep dots visible
    // if (dotDiplScty) dotDiplScty.style.display = 'none'; // Keep dots visible

    // Update question area to show completion message
    if(questionLabel) questionLabel.innerText = localeData.completeMessage || "Complete!";
    if(questionTitle) questionTitle.innerText = localeData.allAnsweredMessage || "All questions answered";

    // Show the results area
    if(resultsArea) resultsArea.style.display = 'block';

    // --- Update Ideology Result and Tooltip ---
    if(ideologyResultEl) {
        // Get the name of the matched ideology (or "Unknown")
        const ideologyNameKey = closestIdeology ? closestIdeology.name : "Unknown";
        // Get the translated name from localeData
        const translatedIdeologyName = (localeData.ideologies && localeData.ideologies[ideologyNameKey])
                                       ? localeData.ideologies[ideologyNameKey]
                                       : ideologyNameKey; // Fallback to the key name
        ideologyResultEl.innerText = translatedIdeologyName; // Display the name

        // Set the tooltip text using the description from localeData
        const ideologyDescription = (localeData.ideologyDescriptions && localeData.ideologyDescriptions[ideologyNameKey])
                                    ? localeData.ideologyDescriptions[ideologyNameKey]
                                    : (localeData.ideologyDescriptions?.Unknown || "Description not available."); // Fallback description
        ideologyResultEl.setAttribute('data-tooltip', ideologyDescription); // Set tooltip content
    }
    // Update the "Your closest match:" text
    if (resultsTitleEl && localeData.resultsTitle) resultsTitleEl.innerText = localeData.resultsTitle;

    // --- Update Bar Chart ---
    // Set the width and text for each bar segment
    setBarValue(barEquality, valEquality, equalityScore);
    setBarValue(barMarket, valMarket, marketScore);
    setBarValue(barNation, valNation, nationScore);
    setBarValue(barGlobe, valGlobe, globeScore);
    setBarValue(barLiberty, valLiberty, libertyScore);
    setBarValue(barAuthority, valAuthority, authorityScore);
    setBarValue(barTradition, valTradition, traditionScore);
    setBarValue(barProgress, valProgress, progressScore);

    // --- Update Axis Labels (Descriptive terms like "Socialist") ---
    // Note: Pass the score corresponding to the "left/top" side (index 0) of the axis labels array
    if(labelEcon) labelEcon.innerText = getAxisLabel(equalityScore, 'econ');
    if(labelDipl) labelDipl.innerText = getAxisLabel(globeScore, 'dipl'); // Globe corresponds to index 0 for dipl
    if(labelGovt) labelGovt.innerText = getAxisLabel(libertyScore, 'govt'); // Liberty corresponds to index 0 for govt
    if(labelScty) labelScty.innerText = getAxisLabel(progressScore, 'scty'); // Progress corresponds to index 0 for scty

  }

  // --- Find Closest Ideology ---
  // Calculates the Euclidean distance between user scores and each ideology's stats
  function findClosestIdeology(userScores) {
    if (!ideologies || ideologies.length === 0) return null; // Exit if ideologies not loaded
    let closestMatch = null;
    let minDistance = Infinity; // Start with maximum possible distance

    ideologies.forEach(ideology => {
      if (!ideology.stats) return; // Skip if ideology has no stats defined
      const ideologyScores = ideology.stats;
      // Calculate squared Euclidean distance in 4D space (econ, dipl, govt, scty)
      // Ensure all values are numbers before calculation
      const distSq = (
        Math.pow(Number(userScores.econ || 0) - Number(ideologyScores.econ || 0), 2) +
        Math.pow(Number(userScores.dipl || 0) - Number(ideologyScores.dipl || 0), 2) +
        Math.pow(Number(userScores.govt || 0) - Number(ideologyScores.govt || 0), 2) +
        Math.pow(Number(userScores.scty || 0) - Number(ideologyScores.scty || 0), 2)
      );
      // If this ideology is closer than the current closest, update
      if (distSq < minDistance) {
        minDistance = distSq;
        closestMatch = ideology;
      }
    });
    return closestMatch; // Return the ideology object with the minimum distance
  }

  // --- Start the application ---
  // Add event listener to run the init function when the DOM is fully loaded
  document.addEventListener('DOMContentLoaded', init);

}()); // Immediately Invoked Function Expression (IIFE) to avoid polluting global scope
