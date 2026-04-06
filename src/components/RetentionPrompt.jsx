import { useState } from 'react';

export default function RetentionPrompt({
  moduleId,
  questions,
  isComplete,
  onComplete,
  allResourcesDone,
  pedagogy,
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [finished, setFinished] = useState(isComplete);

  if (finished) {
    return (
      <section className="retention-section retention-section--complete" aria-label="Quiz completed">
        <h3>Module quiz complete</h3>
        <p>
          You answered {correctCount} of {questions.length} correctly.
        </p>
      </section>
    );
  }

  if (!allResourcesDone) {
    return (
      <section className="retention-section retention-section--locked" aria-label="Quiz locked">
        <h3>Module quiz</h3>
        <p>Complete all resources in this module to unlock the quiz.</p>
      </section>
    );
  }

  const question = questions[currentIndex];
  const isLastQuestion = currentIndex === questions.length - 1;

  function handleSelect(optionIndex) {
    if (showExplanation) return;
    setSelectedAnswer(optionIndex);
    setShowExplanation(true);
    if (optionIndex === question.correctIndex) {
      setCorrectCount((c) => c + 1);
    }
  }

  function handleNext() {
    if (isLastQuestion) {
      setFinished(true);
      onComplete();
    } else {
      setCurrentIndex((i) => i + 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
    }
  }

  return (
    <section className="retention-section" aria-label="Module quiz">
      <h3>
        Question {currentIndex + 1} of {questions.length}
      </h3>
      <p className="quiz-question">{question.question}</p>

      <div className="quiz-options" role="radiogroup" aria-label="Answer options">
        {question.options.map((option, i) => {
          let optionClass = 'quiz-option';
          if (showExplanation) {
            if (i === question.correctIndex) optionClass += ' quiz-option--correct';
            else if (i === selectedAnswer) optionClass += ' quiz-option--incorrect';
          } else if (i === selectedAnswer) {
            optionClass += ' quiz-option--selected';
          }

          return (
            <button
              key={i}
              className={optionClass}
              onClick={() => handleSelect(i)}
              disabled={showExplanation}
              role="radio"
              aria-checked={i === selectedAnswer}
            >
              {option}
            </button>
          );
        })}
      </div>

      {showExplanation && (
        <div className="quiz-explanation">
          <p>{question.explanation}</p>
          <button className="quiz-next-button" onClick={handleNext}>
            {isLastQuestion ? 'Finish quiz' : 'Next question'}
          </button>
        </div>
      )}
    </section>
  );
}
