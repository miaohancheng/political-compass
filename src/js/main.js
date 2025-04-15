(function() {
  // --- DOM Elements ---
  const dot = document.getElementById('dot');
  const questionLabel = document.getElementById('question-label');
  const questionTitle = document.getElementById('question-title');
  const answersContainer = document.getElementById('answers');
  const answerButtons = document.querySelectorAll('.answer');
  const resultsArea = document.getElementById('results-area');
  const ideologyResultEl = document.getElementById('ideology-result');
  const langEnButton = document.getElementById('lang-en');
  const langZhButton = document.getElementById('lang-zh');
  const backButton = document.getElementById('back-button');
  const loadingErrorEl = document.getElementById('loading-error');
  const htmlEl = document.documentElement; // For setting lang attribute

  // --- State Variables ---
  let currentQuestionIndex = 0;
  let questions = [];
  let ideologies = [];
  let currentLang = 'en'; // Default language
  let localeData = {};
  let userAnswers = {}; // Stores cumulative scores for each axis
  const maxScores = { econ: 0, dipl: 0, govt: 0, scty: 0 }; // To normalize scores
  let quizProgress = []; // To store selected answer index for each question (for potential back navigation)

  // --- Constants for 8values scoring ---
  // Maps button data-value to score multiplier
  const answerValues = {
    '1.0': 1.0,  // Strongly Agree
    '0.5': 0.5,  // Agree
    '0.0': 0.0,  // Neutral
    '-0.5': -0.5, // Disagree
    '-1.0': -1.0  // Strongly Disagree
  };

  // --- Initialization ---
  async function init() {
    showLoadingError(null); // Clear any previous errors
    // Determine initial language
    currentLang = localStorage.getItem('preferredLang') || (navigator.language.startsWith('zh') ? 'zh' : 'en'); // Prefer browser lang

    try {
        await loadConfigAndLocale(currentLang); // Load config and initial locale
        setupEventListeners();
        startQuiz(); // Start or resume quiz based on hash
    } catch (error) {
        console.error("Initialization failed:", error);
        showLoadingError(`Initialization failed: ${error.message}. Please try refreshing.`);
    }
  }

  // --- Show Loading/Error Message ---
  function showLoadingError(message) {
      if (message) {
          loadingErrorEl.textContent = message;
          loadingErrorEl.style.display = 'block';
      } else {
          loadingErrorEl.style.display = 'none';
      }
  }

  // --- Data Loading ---
  async function loadConfigAndLocale(lang) {
    console.log(`Loading config and locale for: ${lang}`);
    showLoadingError(`Loading data for ${lang}...`); // Show loading message
    try {
      const [questionsRes, ideologiesRes, localeRes] = await Promise.all([
        fetch('config/questions.json'),
        fetch('config/ideologies.json'),
        fetch(`locales/${lang}.json`)
      ]);

      // Check all responses
      if (!questionsRes.ok) throw new Error(`Failed to load questions.json (Status: ${questionsRes.status})`);
      if (!ideologiesRes.ok) throw new Error(`Failed to load ideologies.json (Status: ${ideologiesRes.status})`);
      if (!localeRes.ok) throw new Error(`Failed to load locale ${lang}.json (Status: ${localeRes.status})`);


      questions = await questionsRes.json();
      ideologies = await ideologiesRes.json();
      localeData = await localeRes.json();
      currentLang = lang;
      localStorage.setItem('preferredLang', lang); // Save preference
      htmlEl.lang = lang; // Set HTML lang attribute

      // Only calculate max scores if questions loaded successfully
      if (questions && questions.length > 0) {
          calculateMaxScores();
      } else {
          throw new Error("Questions data is empty or invalid.");
      }

      applyTranslations(); // Apply translations after loading locale
      console.log("Data loaded successfully:", { questions_count: questions.length, ideologies_count: ideologies.length, locale: lang });
      showLoadingError(null); // Clear loading message

    } catch (error) {
      console.error("Failed to load data:", error);
      // Display specific error message to user
      showLoadingError(`Error loading data: ${error.message}. Please check network and file paths.`);
      throw error; // Re-throw error to be caught by init
    }
  }

  // --- Calculate Max Scores for Normalization ---
   function calculateMaxScores() {
        // Reset scores before recalculating
        maxScores.econ = 0;
        maxScores.dipl = 0;
        maxScores.govt = 0;
        maxScores.scty = 0;
        questions.forEach(q => {
            // Ensure effect object and properties exist
            if (q.effect) {
                maxScores.econ += Math.abs(q.effect.econ || 0);
                maxScores.dipl += Math.abs(q.effect.dipl || 0);
                maxScores.govt += Math.abs(q.effect.govt || 0);
                maxScores.scty += Math.abs(q.effect.scty || 0);
            } else {
                console.warn("Question missing effect object:", q);
            }
        });
        // Prevent division by zero if an axis has no questions affecting it
        for (const axis in maxScores) {
            if (maxScores[axis] === 0) {
                maxScores[axis] = 1; // Avoid division by zero, score will remain 0
                console.warn(`Max score for axis ${axis} is 0. Normalization might be affected.`);
            }
        }
        console.log("Max scores calculated:", maxScores);
   }

  // --- Language Switching ---
  async function switchLanguage(lang) {
      if (lang === currentLang) return;
      console.log(`Switching language to: ${lang}`);
      try {
          await loadConfigAndLocale(lang); // Reload locale and config (config shouldn't change but good practice)
          // Reload current question/results view in new language
          if (currentQuestionIndex >= questions.length) {
              showResults(); // If already on results page, re-render results
          } else {
              loadQuestion(currentQuestionIndex); // Reload current question
          }
          // Update chart labels via event
          window.dispatchEvent(new CustomEvent('languageChanged', { detail: { localeData: localeData } }));
          console.log(`Language switched to ${lang}`);
      } catch (error) {
          console.error(`Failed to switch language to ${lang}:`, error);
          showLoadingError(`Failed to switch language: ${error.message}`);
          // Optionally revert to previous language or show persistent error
      }
  }

  // --- Translations ---
  function applyTranslations() {
      if (!localeData || Object.keys(localeData).length === 0) {
          console.warn("Attempted to apply translations with no locale data loaded.");
          return;
      }
      // Update page title
      document.title = localeData.title || 'Political Compass';

      // Translate elements with data-i18n attribute
      document.querySelectorAll('[data-i18n]').forEach(el => {
          const key = el.getAttribute('data-i18n');
          // Basic check for key existence
          el.innerText = localeData[key] !== undefined ? localeData[key] : `Missing: ${key}`;
      });

       // Translate alt text for elements with data-i18n-alt
       document.querySelectorAll('[data-i18n-alt]').forEach(el => {
            const keyPath = el.getAttribute('data-i18n-alt');
            // Basic nested key access (e.g., "answerAlt.stronglyAgree")
            const keys = keyPath.split('.');
            let translation = localeData;
            try { // Add try-catch for safer nested access
                keys.forEach(k => {
                    translation = translation[k]; // Access nested property
                });
            } catch (e) {
                translation = null; // Handle cases where intermediate keys don't exist
            }

            // Update alt text for images inside buttons, or button title if no image
            const img = el.querySelector('img');
            if (img) {
                img.alt = translation !== undefined && translation !== null ? translation : `Missing: ${keyPath}`;
            } else {
                // Apply to button title/tooltip if no image found
                el.title = translation !== undefined && translation !== null ? translation : `Missing: ${keyPath}`;
            }
       });

      // Update specific elements by ID if needed (e.g., results title)
      const resultsTitleEl = document.getElementById('resultsTitle');
      if (resultsTitleEl && localeData.resultsTitle) {
          resultsTitleEl.innerText = localeData.resultsTitle;
      }

      // Translate answer button alt texts (redundant if using data-i18n-alt, but safe fallback)
      answerButtons.forEach(button => {
         const value = button.getAttribute('data-value');
         const img = button.querySelector('img');
         if (img && localeData.answerAlt) { // Check if answerAlt exists
            let altKey;
            if (value === '1.0') altKey = 'stronglyAgree';
            else if (value === '0.5') altKey = 'agree';
            else if (value === '0.0') altKey = 'neutral';
            else if (value === '-0.5') altKey = 'disagree';
            else if (value === '-1.0') altKey = 'stronglyDisagree';

            if (altKey && localeData.answerAlt[altKey]) { // Check if specific key exists
                img.alt = localeData.answerAlt[altKey];
            }
         }
       });

      // Update chart labels via event (chart.js needs to listen)
      window.dispatchEvent(new CustomEvent('languageChanged', { detail: { localeData: localeData } }));
      console.log("Translations applied for language:", currentLang);
  }

  // --- Event Listeners ---
  function setupEventListeners() {
    answerButtons.forEach(button => {
      button.removeEventListener('click', handleAnswerClick); // Prevent duplicates
      button.addEventListener('click', handleAnswerClick);
    });
    langEnButton.addEventListener('click', () => switchLanguage('en'));
    langZhButton.addEventListener('click', () => switchLanguage('zh'));
    backButton.addEventListener('click', startQuiz); // Back button restarts the quiz

     // Handle browser navigation (back/forward buttons)
    window.addEventListener('hashchange', handleHashChange);
  }


  // --- Quiz Logic ---
  function startQuiz() {
    console.log("Starting or resetting quiz.");
    resetQuizState();
    const hash = window.location.hash.slice(1);
    const questionNum = parseInt(hash, 10);

    // Validate question number from hash
    if (!isNaN(questionNum) && questionNum > 0 && questionNum <= questions.length) {
         currentQuestionIndex = questionNum - 1;
         console.log(`Resuming quiz from question ${questionNum} based on hash.`);
         // TODO: Need to recalculate score based on stored progress if resuming
         // For simplicity now, hash only sets the starting visual question, score starts fresh
         // A more robust resume would involve storing 'quizProgress' and 'userAnswers' in localStorage
    } else {
         currentQuestionIndex = 0; // Start from beginning
         window.location.hash = ''; // Clear invalid hash
    }

    if (questions && questions.length > 0) {
        loadQuestion(currentQuestionIndex);
        updateChart(); // Initial chart state (center)
    } else {
        console.error("Cannot start quiz, questions not loaded.");
        showLoadingError("Error: Questions could not be loaded. Cannot start quiz.");
    }
  }

   function resetQuizState() {
      currentQuestionIndex = 0;
      userAnswers = { econ: 0, dipl: 0, govt: 0, scty: 0 };
      quizProgress = []; // Clear progress
      resultsArea.style.display = 'none'; // Hide results
      answersContainer.style.display = 'flex'; // Show answers
      if (dot) dot.style.display = 'block'; // Ensure dot is visible initially
      window.location.hash = ''; // Clear hash
      // Reset any visual cues on answers if needed
      answerButtons.forEach(btn => btn.classList.remove('selected')); // Example visual reset
      console.log("Quiz state reset.");
   }

  function loadQuestion(index) {
    // Basic checks
    if (!questions || questions.length === 0 || !localeData || Object.keys(localeData).length === 0) {
        console.error("Questions or locale data not loaded yet for loadQuestion.");
        showLoadingError("Error loading question data.");
        questionLabel.innerText = "Error";
        questionTitle.innerText = "Could not load question.";
        return;
    }
     if (index < 0 || index >= questions.length) {
         console.error(`Invalid question index: ${index}`);
         // Maybe show results if index is too high?
         if (index >= questions.length) {
             showResults();
         }
         return;
     }


    const question = questions[index];
    // Use index for question key in locale file (e.g., "q0", "q1")
    const questionKey = `q${index}`;

    // Use localeData for question text and label, provide fallbacks
    questionLabel.innerText = `${localeData.questionLabel || 'Question'} ${index + 1} / ${questions.length}`;
    // Fallback to the question text from config if translation is missing
    questionTitle.innerText = (localeData.questions && localeData.questions[questionKey]) ? localeData.questions[questionKey] : (question.question || "Question text missing");

    answersContainer.style.display = 'flex';
    resultsArea.style.display = 'none';
    if (dot) dot.style.display = 'block'; // Ensure dot is visible during quiz
    window.location.hash = index + 1; // Update hash for current question

    // Optional: Highlight previously selected answer if navigating back/forward
    // This requires storing the selection in quizProgress
  }

  function handleAnswerClick(event) {
    const button = event.target.closest('.answer');
    if (!button) return;

    const valueStr = button.getAttribute('data-value');
    const answerValue = answerValues[valueStr]; // Get the numeric multiplier (-1.0 to 1.0)

    if (answerValue === undefined) {
        console.error("Invalid answer value on button:", valueStr);
        return;
    }

    console.log(`Q${currentQuestionIndex + 1}: Answered with value ${answerValue}`);

    // Store which button was clicked (e.g., its index or value)
    // quizProgress[currentQuestionIndex] = valueStr; // Store the value string

    // --- Calculate score incrementally ---
    const question = questions[currentQuestionIndex];
    if (!question || !question.effect) {
        console.error(`Data issue for question index ${currentQuestionIndex}. Cannot calculate score.`);
        // Maybe skip to next question or show error
        return;
    }

    // Add score contribution for this question
    userAnswers.econ += answerValue * (question.effect.econ || 0);
    userAnswers.dipl += answerValue * (question.effect.dipl || 0);
    userAnswers.govt += answerValue * (question.effect.govt || 0);
    userAnswers.scty += answerValue * (question.effect.scty || 0);

    button.blur(); // Remove focus from the button

    // Optional: Add visual feedback to selected button
    answerButtons.forEach(btn => btn.classList.remove('selected'));
    button.classList.add('selected'); // Add a 'selected' class for styling

    updateChart(); // Update the dot position in real-time

    // Move to next question or show results
    currentQuestionIndex++;
    if (currentQuestionIndex < questions.length) {
      // Delay slightly before loading next question for visual feedback
      setTimeout(() => {
          loadQuestion(currentQuestionIndex);
          answerButtons.forEach(btn => btn.classList.remove('selected')); // Clear selection for next question
      }, 150); // 150ms delay
    } else {
      // Delay slightly before showing results
       setTimeout(showResults, 200);
    }
  }

  // --- Handle Browser Navigation (Basic) ---
    function handleHashChange() {
        // Avoid reacting to hash changes caused by clicking answers
        if (window.location.hash === `#${currentQuestionIndex + 1}`) {
            return;
        }

        const hash = window.location.hash.slice(1);
        const targetQuestionNum = parseInt(hash, 10);

        console.log(`Hash changed to: #${hash}`);

        // Check if navigating back/forward to a valid question number
        if (!isNaN(targetQuestionNum) && targetQuestionNum > 0 && targetQuestionNum <= questions.length) {
            console.log(`Navigating via hash to question ${targetQuestionNum}`);
            // Simple approach: Just load the question visually.
            // Score calculation remains based on sequential progress unless resume logic is added.
            currentQuestionIndex = targetQuestionNum - 1; // Update index to match hash
            loadQuestion(currentQuestionIndex);
            // Recalculate score up to this point if needed for accurate dot position
            recalculateScoreUpToIndex(currentQuestionIndex);
            updateChart();
        } else if (hash === '' && currentQuestionIndex > 0) {
            // Hash cleared, likely going back to the start page
            console.log("Hash cleared, resetting quiz.");
            startQuiz(); // Restart the quiz
        }
    }

    // Helper to recalculate score if navigating back/forward (requires quizProgress)
    function recalculateScoreUpToIndex(index) {
        // This function needs the 'quizProgress' array to be populated correctly
        // For now, this is a placeholder as quizProgress isn't fully utilized for resume
        console.warn("Recalculate score called, but depends on unimplemented quizProgress tracking.");
        // Reset scores
        userAnswers = { econ: 0, dipl: 0, govt: 0, scty: 0 };
        // Loop through questions up to the target index
        // for (let i = 0; i < index; i++) {
        //     const storedAnswerValueStr = quizProgress[i]; // Get stored answer value string
        //     if (storedAnswerValueStr !== undefined) {
        //         const answerValue = answerValues[storedAnswerValueStr];
        //         const question = questions[i];
        //         if (question && question.effect && answerValue !== undefined) {
        //             userAnswers.econ += answerValue * (question.effect.econ || 0);
        //             userAnswers.dipl += answerValue * (question.effect.dipl || 0);
        //             userAnswers.govt += answerValue * (question.effect.govt || 0);
        //             userAnswers.scty += answerValue * (question.effect.scty || 0);
        //         }
        //     }
        // }
    }


  // --- Chart Update (Real-time Dot Position) ---
  function updateChart() {
     // Ensure dot element exists and maxScores are calculated
     if (!dot || !maxScores.econ || maxScores.econ === 1) { // Check if maxScores seem valid
         console.warn("Dot element or maxScores not ready/valid for chart update.");
         return;
     }

     // --- Calculate current normalized scores (0-100) ---
     // Normalization: Score = 50 + 50 * (CurrentSum / MaxPossibleSum)
     const currentScores = {
         econ: 50 + 50 * (userAnswers.econ / maxScores.econ),
         dipl: 50 + 50 * (userAnswers.dipl / maxScores.dipl),
         govt: 50 + 50 * (userAnswers.govt / maxScores.govt), // Higher score = More Liberty
         scty: 50 + 50 * (userAnswers.scty / maxScores.scty)  // Higher score = More Progress
     };

     // Clamp scores between 0 and 100
     for (const axis in currentScores) {
        currentScores[axis] = Math.max(0, Math.min(100, currentScores[axis]));
     }

     // --- Mapping 8values axes to the 2D Political Compass ---
     // Economic Left/Right <-> 8values Economic (Equality/Market) (econ)
     // Social Libertarian/Authoritarian <-> 8values Civil (Liberty/Authority) (govt)

     // Convert the relevant 0-100 scores to the -1 to 1 range for positioning
     // Economic: 0 Equality -> -1 Left; 100 Market -> +1 Right
     const positionX = (currentScores.econ / 50) - 1;
     // Civil: 100 Liberty -> -1 Libertarian (bottom); 0 Authority -> +1 Authoritarian (top)
     const positionY = 1 - (currentScores.govt / 50); // Invert govt axis for Y position

     // Apply to dot position (0% to 100%)
     // Position X: -1 -> 0%; +1 -> 100%  => (positionX + 1) / 2 * 100
     // Position Y: +1 (Top/Authority) -> 0%; -1 (Bottom/Liberty) -> 100% => (1 - positionY) / 2 * 100
     dot.style.left = ((positionX + 1) / 2) * 100 + '%';
     dot.style.top = ((1 - positionY) / 2) * 100 + '%';

     // console.log('Chart Update:', { raw: userAnswers, norm: currentScores, pos: { x: positionX, y: positionY }, style: { left: dot.style.left, top: dot.style.top } });
  }

  // --- Final Results ---
  function showResults() {
    console.log("Quiz complete. Calculating final results.");
    console.log("Final Raw Scores:", userAnswers);

    // Calculate final normalized scores (0-100), clamping included
     const finalScores = {
         econ: Math.max(0, Math.min(100, 50 + 50 * (userAnswers.econ / maxScores.econ))),
         dipl: Math.max(0, Math.min(100, 50 + 50 * (userAnswers.dipl / maxScores.dipl))),
         govt: Math.max(0, Math.min(100, 50 + 50 * (userAnswers.govt / maxScores.govt))),
         scty: Math.max(0, Math.min(100, 50 + 50 * (userAnswers.scty / maxScores.scty)))
     };

     console.log("Final Normalized Scores (0-100):", finalScores);

    // Find closest ideology
    const closestIdeology = findClosestIdeology(finalScores);
    console.log("Closest Ideology Match:", closestIdeology);

    // --- Display results ---
    answersContainer.style.display = 'none'; // Hide answers
    if (dot) dot.style.display = 'none'; // Hide the dot on the results screen

    // Use translated messages
    questionLabel.innerText = localeData.completeMessage || "Complete!";
    questionTitle.innerText = localeData.allAnsweredMessage || "All questions answered";

    resultsArea.style.display = 'block'; // Show results section

    // Get ideology name and translate it
    const ideologyNameKey = closestIdeology ? closestIdeology.name : "Unknown";
    // Translate using localeData.ideologies, fallback to the key itself
    const translatedIdeologyName = (localeData.ideologies && localeData.ideologies[ideologyNameKey]) ? localeData.ideologies[ideologyNameKey] : ideologyNameKey;
    ideologyResultEl.innerText = translatedIdeologyName;

    // Optionally display final scores numerically
    // Example: ideologyResultEl.innerText += ` (Econ: ${finalScores.econ.toFixed(1)}, Dipl: ${finalScores.dipl.toFixed(1)}, Govt: ${finalScores.govt.toFixed(1)}, Scty: ${finalScores.scty.toFixed(1)})`;

    // No hash update needed here, results page doesn't correspond to a question number
  }

  // --- Find Closest Ideology ---
  function findClosestIdeology(userScores) {
    if (!ideologies || ideologies.length === 0) {
        console.error("Ideologies data not loaded or empty.");
        return null;
    }

    let closestMatch = null;
    let minDistance = Infinity;

    ideologies.forEach(ideology => {
      // Ensure ideology has stats
      if (!ideology.stats) {
          console.warn("Ideology missing stats:", ideology.name);
          return; // Skip this ideology
      }
      const ideologyScores = ideology.stats;

      // Calculate Euclidean distance in 4D space
      // Ensure all scores are numbers before calculation
      const distSq = (
        Math.pow(Number(userScores.econ || 0) - Number(ideologyScores.econ || 0), 2) +
        Math.pow(Number(userScores.dipl || 0) - Number(ideologyScores.dipl || 0), 2) +
        Math.pow(Number(userScores.govt || 0) - Number(ideologyScores.govt || 0), 2) +
        Math.pow(Number(userScores.scty || 0) - Number(ideologyScores.scty || 0), 2)
      );

      // No need for sqrt if just comparing distances
      if (distSq < minDistance) {
        minDistance = distSq;
        closestMatch = ideology;
      }
    });
    return closestMatch;
  }

  // --- Start the application ---
  init();

}());
