(function() {
  // --- DOM Elements ---
  let mainTitleEl, dot, questionLabel, questionTitle, answersContainer, answerButtons,
      answerAnnotations, resultsArea, ideologyResultEl, resultsTitleEl, langEnButton,
      langZhButton, backButton, prevButton, loadingErrorEl, htmlEl, metaDescriptionEl,
      tipEquality, tipMarket, tipNation, tipGlobe, tipLiberty, tipAuthority, tipTradition, tipProgress,
      answersWrapperEl, // Parent div for answers + prev button
      // Score display elements
      scoreEqualityEl, scoreMarketEl, scoreNationEl, scoreGlobeEl,
      scoreLibertyEl, scoreAuthorityEl, scoreTraditionEl, scoreProgressEl,
      // Bar elements
      barEquality, barMarket, barNation, barGlobe, barLiberty, barAuthority, barTradition, barProgress,
      // Bar value text elements
      valEquality, valMarket, valNation, valGlobe, valLiberty, valAuthority, valTradition, valProgress,
      // Axis label elements
      labelEcon, labelDipl, labelGovt, labelScty;


  // Function to get elements, called after DOM is ready or within init
  function getDOMElements() {
      mainTitleEl = document.getElementById('main-title');
      dot = document.getElementById('dot');
      questionLabel = document.getElementById('question-label');
      questionTitle = document.getElementById('question-title');
      answersContainer = document.getElementById('answers');
      answersWrapperEl = document.getElementById('answers-container');
      answerButtons = document.querySelectorAll('.answer');
      answerAnnotations = document.querySelectorAll('.answer-annotation');
      resultsArea = document.getElementById('results-area');
      ideologyResultEl = document.getElementById('ideology-result');
      resultsTitleEl = document.getElementById('resultsTitle');
      langEnButton = document.getElementById('lang-en');
      langZhButton = document.getElementById('lang-zh');
      backButton = document.getElementById('back-button');
      prevButton = document.getElementById('prev-button');
      loadingErrorEl = document.getElementById('loading-error');
      htmlEl = document.documentElement;
      metaDescriptionEl = document.getElementById('meta-description');
      tipEquality = document.getElementById('tip-equality');
      tipMarket = document.getElementById('tip-market');
      tipNation = document.getElementById('tip-nation');
      tipGlobe = document.getElementById('tip-globe');
      tipLiberty = document.getElementById('tip-liberty');
      tipAuthority = document.getElementById('tip-authority');
      tipTradition = document.getElementById('tip-tradition');
      tipProgress = document.getElementById('tip-progress');
      // Get score elements
      scoreEqualityEl = document.getElementById('score-equality');
      scoreMarketEl = document.getElementById('score-market');
      scoreNationEl = document.getElementById('score-nation');
      scoreGlobeEl = document.getElementById('score-globe');
      scoreLibertyEl = document.getElementById('score-liberty');
      scoreAuthorityEl = document.getElementById('score-authority');
      scoreTraditionEl = document.getElementById('score-tradition');
      scoreProgressEl = document.getElementById('score-progress');
      // Get bar elements
      barEquality = document.getElementById('bar-equality');
      barMarket = document.getElementById('bar-market');
      barNation = document.getElementById('bar-nation');
      barGlobe = document.getElementById('bar-globe');
      barLiberty = document.getElementById('bar-liberty');
      barAuthority = document.getElementById('bar-authority');
      barTradition = document.getElementById('bar-tradition');
      barProgress = document.getElementById('bar-progress');
      // Get bar value text elements
      valEquality = document.getElementById('equality-val');
      valMarket = document.getElementById('market-val');
      valNation = document.getElementById('nation-val');
      valGlobe = document.getElementById('globe-val');
      valLiberty = document.getElementById('liberty-val');
      valAuthority = document.getElementById('authority-val');
      valTradition = document.getElementById('tradition-val');
      valProgress = document.getElementById('progress-val');
      // Get axis label elements
      labelEcon = document.getElementById('economic-label');
      labelDipl = document.getElementById('diplomatic-label');
      labelGovt = document.getElementById('civil-label'); // ID from HTML is civil-label
      labelScty = document.getElementById('societal-label');
  }


  // --- State Variables ---
  let currentQuestionIndex = 0;
  let questions = [];
  let shuffledQuestions = [];
  let ideologies = [];
  let currentLang = 'en';
  let localeData = {};
  let userAnswers = {};
  let scoreHistory = [];
  const maxScores = { econ: 0, dipl: 0, govt: 0, scty: 0 };

  // --- Constants for scoring ---
  const answerValues = {
    '1.0': 1.0, '0.5': 0.5, '0.0': 0.0, '-0.5': -0.5, '-1.0': -1.0
  };

  // --- Initialization ---
  async function init() {
    getDOMElements();
    if (!loadingErrorEl || !htmlEl) {
        console.error("Essential DOM elements not found. Aborting.");
        alert("Error initializing page.");
        return;
    }
    showLoadingError(null);
    currentLang = localStorage.getItem('preferredLang') || (navigator.language.startsWith('zh') ? 'zh' : 'en');
    try {
        await loadConfigAndLocale(currentLang);
        setupEventListeners();
        startQuiz();
    } catch (error) {
        console.error("Initialization failed:", error);
        showLoadingError(`Initialization failed: ${error.message}. Please try refreshing.`);
    }
  }

  // --- Show Loading/Error Message ---
  function showLoadingError(message) {
      if (loadingErrorEl) {
          loadingErrorEl.style.display = message ? 'block' : 'none';
          if(message) loadingErrorEl.textContent = message;
      } else {
          console.error("loading-error element not found.");
          if (message) alert(message);
      }
  }

  // --- Data Loading ---
  async function loadConfigAndLocale(lang) {
    console.log(`Loading config and locale for: ${lang}`);
    showLoadingError(`Loading data for ${lang}...`);
    try {
      const [questionsRes, ideologiesRes, localeRes] = await Promise.all([
        fetch('config/questions.json'),
        fetch('config/ideologies.json'),
        fetch(`locales/${lang}.json`)
      ]);

      if (!questionsRes.ok) throw new Error(`Questions fetch failed: ${questionsRes.status}`);
      if (!ideologiesRes.ok) throw new Error(`Ideologies fetch failed: ${ideologiesRes.status}`);
      if (!localeRes.ok) throw new Error(`Locale fetch failed: ${localeRes.status}`);

      questions = await questionsRes.json();
      ideologies = await ideologiesRes.json();
      localeData = await localeRes.json();

      currentLang = lang;
      localStorage.setItem('preferredLang', lang);
      if (htmlEl) htmlEl.lang = lang;

      if (questions && questions.length > 0 && maxScores.econ === 0) {
          calculateMaxScores();
      } else if (!questions || questions.length === 0) {
          throw new Error("Questions data is empty.");
      }

      applyTranslations();
      console.log("Data loaded successfully:", { questions_count: questions.length, ideologies_count: ideologies.length, locale: lang });
      showLoadingError(null);

    } catch (error) {
      console.error("Failed to load data:", error);
      showLoadingError(`Error loading data: ${error.message}. Check network and file paths.`);
      throw error;
    }
  }

   // --- Calculate Max Scores ---
   function calculateMaxScores() {
        maxScores.econ = 0; maxScores.dipl = 0; maxScores.govt = 0; maxScores.scty = 0;
        questions.forEach(q => {
            if (q.effect) {
                maxScores.econ += Math.abs(q.effect.econ || 0);
                maxScores.dipl += Math.abs(q.effect.dipl || 0);
                maxScores.govt += Math.abs(q.effect.govt || 0);
                maxScores.scty += Math.abs(q.effect.scty || 0);
            }
        });
        for (const axis in maxScores) {
            if (maxScores[axis] === 0) maxScores[axis] = 1;
        }
        console.log("Max scores calculated:", maxScores);
   }

  // --- Language Switching ---
  async function switchLanguage(lang) {
      if (lang === currentLang) return;
      console.log(`Switching language to: ${lang}`);
      try {
          const localeRes = await fetch(`locales/${lang}.json`);
          if (!localeRes.ok) throw new Error(`Locale fetch failed: ${localeRes.status}`);
          localeData = await localeRes.json();
          currentLang = lang;
          localStorage.setItem('preferredLang', lang);
          if (htmlEl) htmlEl.lang = lang;

          applyTranslations();

          if (shuffledQuestions && currentQuestionIndex >= shuffledQuestions.length) {
              showResults();
          } else if (shuffledQuestions && shuffledQuestions.length > 0) {
              loadQuestion(currentQuestionIndex);
          }
          window.dispatchEvent(new CustomEvent('languageChanged', { detail: { localeData: localeData } }));
          console.log(`Language switched to ${lang}`);
      } catch (error) {
          console.error(`Failed to switch language to ${lang}:`, error);
          showLoadingError(`Failed to switch language: ${error.message}`);
      }
  }

  // --- Translations ---
  function applyTranslations() {
      if (!localeData || Object.keys(localeData).length === 0) return;
      if (!mainTitleEl) getDOMElements();

      document.title = localeData.title || 'Political Compass Test';
      if (metaDescriptionEl && localeData.description) {
          metaDescriptionEl.setAttribute('content', localeData.description);
      } else if (metaDescriptionEl) {
          metaDescriptionEl.setAttribute('content', 'Take the 8values political compass test.');
      }

      if (mainTitleEl) mainTitleEl.innerText = localeData.mainTitle || "8values Test";

      document.querySelectorAll('[data-i18n]').forEach(el => {
          const key = el.getAttribute('data-i18n');
          el.innerText = localeData?.[key] ?? `Missing: ${key}`;
      });

       document.querySelectorAll('[data-i18n-alt]').forEach(el => {
            const keyPath = el.getAttribute('data-i18n-alt');
            const keys = keyPath.split('.');
            let translation = localeData;
            try { keys.forEach(k => { translation = translation[k]; }); } catch (e) { translation = null; }
            const img = el.querySelector('img');
            if (img) img.alt = translation ?? `Missing: ${keyPath}`;
            else el.title = translation ?? `Missing: ${keyPath}`;
       });

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

      if (resultsTitleEl && localeData.resultsTitle) resultsTitleEl.innerText = localeData.resultsTitle;
      if (backButton && localeData.backButton) backButton.innerText = localeData.backButton;
      if (prevButton && localeData.prevButton) prevButton.innerText = localeData.prevButton;

      // Update axis hover tips (title attribute) & add console log for debugging
      console.log("Attempting to set axis tips. Locale data:", localeData?.axisTips);
      if(localeData.axisTips) {
          const tipsMap = {
              'equality': tipEquality, 'market': tipMarket, 'nation': tipNation,
              'globe': tipGlobe, 'liberty': tipLiberty, 'authority': tipAuthority,
              'tradition': tipTradition, 'progress': tipProgress
          };
          for (const key in localeData.axisTips) {
               // Generate the element ID from the locale key (e.g., tipEquality -> tip-equality)
              const elementId = key.replace(/^tip/, 'tip-').toLowerCase();
              const element = document.getElementById(elementId); // Get element directly
              const tipText = localeData.axisTips[key];
              if (element) {
                  element.title = tipText || '';
                  // console.log(`Set title for #${elementId}`); // Simplified log
              } else {
                  console.warn(`Element #${elementId} for tip key ${key} not found.`);
              }
          }
      } else {
          console.warn("localeData.axisTips not found.");
      }

      // Update result axis labels (numerical and bar chart titles)
       document.querySelectorAll('[data-i18n^="resultsAxis"], [data-i18n^="axis"]').forEach(el => {
           const key = el.getAttribute('data-i18n');
           if (localeData[key]) {
               el.innerText = localeData[key];
           }
       });


      window.dispatchEvent(new CustomEvent('languageChanged', { detail: { localeData: localeData } }));
      console.log("Translations applied for language:", currentLang);
  }

  // --- Event Listeners ---
  function setupEventListeners() {
    if (!answerButtons || !langEnButton || !langZhButton || !backButton || !prevButton) {
        console.error("Cannot set up listeners: one or more button elements not found.");
        return;
    }
    answerButtons.forEach(button => {
      button.removeEventListener('click', handleAnswerClick);
      button.addEventListener('click', handleAnswerClick);
    });
    langEnButton.addEventListener('click', () => switchLanguage('en'));
    langZhButton.addEventListener('click', () => switchLanguage('zh'));
    backButton.addEventListener('click', startQuiz);
    prevButton.addEventListener('click', prevQuestion);
  }

  // --- Fisher-Yates (Knuth) Shuffle ---
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
  function startQuiz() {
    console.log("Starting or resetting quiz.");
    if (!answersWrapperEl) getDOMElements();

    resetQuizState();

    const questionsWithIndices = questions.map((q, index) => ({
        questionData: q, originalIndex: index
    }));
    shuffledQuestions = shuffleArray(questionsWithIndices);
    console.log("Questions shuffled.");

    currentQuestionIndex = 0;
    window.location.hash = '';

    if (shuffledQuestions && shuffledQuestions.length > 0) {
        loadQuestion(currentQuestionIndex);
        updateChart();
    } else {
        console.error("Cannot start quiz: questions not loaded/shuffled.");
        showLoadingError("Error: Could not load questions.");
    }
  }

   function resetQuizState() {
      currentQuestionIndex = 0;
      userAnswers = { econ: 0, dipl: 0, govt: 0, scty: 0 };
      scoreHistory = [];
      shuffledQuestions = [];

      if (resultsArea) resultsArea.style.display = 'none';
      if (answersWrapperEl) answersWrapperEl.style.display = 'flex';
      if (prevButton) prevButton.style.display = 'none';
      if (dot) dot.style.display = 'flex';

      window.location.hash = '';
      if (answerButtons) {
          answerButtons.forEach(btn => btn.classList.remove('selected'));
      }
      console.log("Quiz state reset.");
   }

  function loadQuestion(index) {
    if (!shuffledQuestions || shuffledQuestions.length === 0 || !localeData?.questions || !questionLabel || !questionTitle || !answersWrapperEl || !resultsArea) {
        console.error("Cannot load question: missing data or elements.");
        showLoadingError("Error loading question.");
        if(answersWrapperEl) answersWrapperEl.style.display = 'none';
        return;
    }
     if (index < 0 || index >= shuffledQuestions.length) {
         if (index >= shuffledQuestions.length) showResults();
         return;
     }

    const currentShuffledItem = shuffledQuestions[index];
    const originalIndex = currentShuffledItem.originalIndex;
    const questionData = currentShuffledItem.questionData;
    const questionKey = `q${originalIndex}`;

    const questionText = localeData.questions[questionKey] ?? (questionData.question || "Question text missing");
    const labelText = `${localeData.questionLabel || 'Question'} ${index + 1} / ${shuffledQuestions.length}`;

    questionLabel.innerText = labelText;
    questionTitle.innerText = questionText;

    if (prevButton) {
        prevButton.style.display = (index > 0) ? 'inline-block' : 'none';
        prevButton.disabled = (index === 0);
    }

    answersWrapperEl.style.display = 'flex';
    resultsArea.style.display = 'none';
    if (dot) dot.style.display = 'flex';
  }

  function handleAnswerClick(event) {
    const button = event.currentTarget;
    if (!button || !shuffledQuestions || currentQuestionIndex >= shuffledQuestions.length) return;

    const valueStr = button.getAttribute('data-value');
    const answerValue = answerValues[valueStr];
    if (answerValue === undefined) return;

    const currentScoreState = typeof structuredClone === 'function'
                              ? structuredClone(userAnswers)
                              : JSON.parse(JSON.stringify(userAnswers));
    scoreHistory.push(currentScoreState);

    const currentShuffledItem = shuffledQuestions[currentQuestionIndex];
    const questionData = currentShuffledItem.questionData;
    if (!questionData?.effect) {
        console.error(`Data issue for question index ${currentQuestionIndex}. Cannot calculate score.`);
        scoreHistory.pop();
        return;
    }

    userAnswers.econ += answerValue * (questionData.effect.econ || 0);
    userAnswers.dipl += answerValue * (questionData.effect.dipl || 0);
    userAnswers.govt += answerValue * (questionData.effect.govt || 0);
    userAnswers.scty += answerValue * (questionData.effect.scty || 0);

    button.blur();
    updateChart();

    currentQuestionIndex++;
    if (currentQuestionIndex < shuffledQuestions.length) {
      loadQuestion(currentQuestionIndex);
    } else {
       showResults();
    }
  }

  // --- Previous Question Function ---
  function prevQuestion() {
      if (currentQuestionIndex <= 0) return;
      console.log("Going back to previous question.");
      currentQuestionIndex--;

      if (scoreHistory.length > 0) {
          userAnswers = scoreHistory.pop();
          console.log("Score restored to:", JSON.stringify(userAnswers));
      } else {
          console.warn("Score history empty.");
      }
      loadQuestion(currentQuestionIndex);
      updateChart();
  }

  // --- Chart Update ---
  function updateChart() {
     if (!dot || !maxScores.econ || maxScores.econ <= 1) return;
     const currentScores = {
         econ: 50 + 50 * (userAnswers.econ / maxScores.econ),
         dipl: 50 + 50 * (userAnswers.dipl / maxScores.dipl),
         govt: 50 + 50 * (userAnswers.govt / maxScores.govt),
         scty: 50 + 50 * (userAnswers.scty / maxScores.scty)
     };
     for (const axis in currentScores) {
        currentScores[axis] = Math.max(0, Math.min(100, currentScores[axis]));
     }
     const positionX = (currentScores.econ / 50) - 1;
     const positionY = 1 - (currentScores.govt / 50);
     dot.style.left = ((positionX + 1) / 2) * 100 + '%';
     dot.style.top = ((1 - positionY) / 2) * 100 + '%';
  }

  // --- Helper function to set bar value and text ---
  function setBarValue(barElement, textElement, value) {
      if (!barElement || !textElement) return;
      const percentage = parseFloat(value).toFixed(1); // Ensure it's a number and format
      barElement.style.width = percentage + "%";
      textElement.innerText = percentage + "%";
      // Hide text if bar is too small (adjust threshold as needed)
      if (textElement.offsetWidth + 10 > barElement.offsetWidth) {
          textElement.style.visibility = "hidden";
      } else {
          textElement.style.visibility = "visible";
      }
  }

  // --- Helper function to get axis label based on score ---
  function getAxisLabel(score, axisType) {
      const labels = localeData?.axisLabels?.[axisType];
      if (!labels || labels.length !== 7) return ""; // Need 7 labels defined in locale

      const val = parseFloat(score); // Ensure score is a number
      if (val > 100) { return ""; }
      else if (val >= 90) { return labels[0]; } // e.g., Communist
      else if (val >= 75) { return labels[1]; } // e.g., Socialist
      else if (val >= 60) { return labels[2]; } // e.g., Social
      else if (val >= 40) { return labels[3]; } // e.g., Centrist/Balanced/Moderate/Neutral
      else if (val >= 25) { return labels[4]; } // e.g., Market
      else if (val >= 10) { return labels[5]; } // e.g., Capitalist
      else if (val >= 0)  { return labels[6]; } // e.g., Laissez-Faire
      else { return ""; }
  }


  // --- Final Results ---
  function showResults() {
    console.log("Quiz complete. Calculating final results.");
    console.log("Final Raw Scores:", userAnswers);

     const finalScores = {
         econ: Math.max(0, Math.min(100, 50 + 50 * (userAnswers.econ / maxScores.econ))),
         dipl: Math.max(0, Math.min(100, 50 + 50 * (userAnswers.dipl / maxScores.dipl))),
         govt: Math.max(0, Math.min(100, 50 + 50 * (userAnswers.govt / maxScores.govt))),
         scty: Math.max(0, Math.min(100, 50 + 50 * (userAnswers.scty / maxScores.scty)))
     };
     console.log("Final Normalized Scores (0-100):", finalScores);

     // Calculate opposing scores
     const marketScore = (100 - finalScores.econ);
     const nationScore = (100 - finalScores.dipl);
     const authorityScore = (100 - finalScores.govt);
     const traditionScore = (100 - finalScores.scty);
     // Primary scores (already 0-100)
     const equalityScore = finalScores.econ;
     const globeScore = finalScores.dipl;
     const libertyScore = finalScores.govt;
     const progressScore = finalScores.scty;


    const closestIdeology = findClosestIdeology(finalScores);
    console.log("Closest Ideology Match:", closestIdeology);

    // --- Display results ---
    if (answersWrapperEl) answersWrapperEl.style.display = 'none';
    if (dot) dot.style.display = 'none';

    if(questionLabel) questionLabel.innerText = localeData.completeMessage || "Complete!";
    if(questionTitle) questionTitle.innerText = localeData.allAnsweredMessage || "All questions answered";

    if(resultsArea) resultsArea.style.display = 'block';
    if(ideologyResultEl) {
        const ideologyNameKey = closestIdeology ? closestIdeology.name : "Unknown";
        const translatedIdeologyName = (localeData.ideologies && localeData.ideologies[ideologyNameKey]) ? localeData.ideologies[ideologyNameKey] : ideologyNameKey;
        ideologyResultEl.innerText = translatedIdeologyName;
    }
    if (resultsTitleEl && localeData.resultsTitle) resultsTitleEl.innerText = localeData.resultsTitle;

    // --- Update Numerical Scores ---
    if(scoreEqualityEl) scoreEqualityEl.innerText = equalityScore.toFixed(1);
    if(scoreMarketEl) scoreMarketEl.innerText = marketScore.toFixed(1);
    if(scoreNationEl) scoreNationEl.innerText = nationScore.toFixed(1);
    if(scoreGlobeEl) scoreGlobeEl.innerText = globeScore.toFixed(1);
    if(scoreLibertyEl) scoreLibertyEl.innerText = libertyScore.toFixed(1);
    if(scoreAuthorityEl) scoreAuthorityEl.innerText = authorityScore.toFixed(1);
    if(scoreTraditionEl) scoreTraditionEl.innerText = traditionScore.toFixed(1);
    if(scoreProgressEl) scoreProgressEl.innerText = progressScore.toFixed(1);

    // --- Update Bar Chart ---
    setBarValue(barEquality, valEquality, equalityScore);
    setBarValue(barMarket, valMarket, marketScore);
    setBarValue(barNation, valNation, nationScore);
    setBarValue(barGlobe, valGlobe, globeScore);
    setBarValue(barLiberty, valLiberty, libertyScore);
    setBarValue(barAuthority, valAuthority, authorityScore);
    setBarValue(barTradition, valTradition, traditionScore);
    setBarValue(barProgress, valProgress, progressScore);

    // --- Update Axis Labels ---
    if(labelEcon) labelEcon.innerText = getAxisLabel(equalityScore, 'econ');
    if(labelDipl) labelDipl.innerText = getAxisLabel(globeScore, 'dipl'); // Use globe score for diplomatic label
    if(labelGovt) labelGovt.innerText = getAxisLabel(libertyScore, 'govt'); // Use liberty score for civil label
    if(labelScty) labelScty.innerText = getAxisLabel(progressScore, 'scty'); // Use progress score for societal label

  }

  // --- Find Closest Ideology ---
  function findClosestIdeology(userScores) {
    if (!ideologies || ideologies.length === 0) return null;
    let closestMatch = null;
    let minDistance = Infinity;
    ideologies.forEach(ideology => {
      if (!ideology.stats) return;
      const ideologyScores = ideology.stats;
      // Use the same distance calculation as before
      const distSq = (
        Math.pow(Number(userScores.econ || 0) - Number(ideologyScores.econ || 0), 2) +
        Math.pow(Number(userScores.dipl || 0) - Number(ideologyScores.dipl || 0), 2) +
        Math.pow(Number(userScores.govt || 0) - Number(ideologyScores.govt || 0), 2) +
        Math.pow(Number(userScores.scty || 0) - Number(ideologyScores.scty || 0), 2)
      );
      if (distSq < minDistance) {
        minDistance = distSq;
        closestMatch = ideology;
      }
    });
    return closestMatch;
  }

  // --- Start the application ---
  document.addEventListener('DOMContentLoaded', init);

}());
