import './App.css';

import React, {useEffect, useMemo, useState} from 'react';

const GAME_GUESS_LIMIT = 5;
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function Row({content, answer}) {
  let statuses = Array(content.length).fill('gray');
  if (answer !== '') {
    let answerFreq = {};

    for (let idx = 0; idx < answer.length; idx++) {
      let answerChar = answer[idx];
      let displayChar = content[idx];

      if (answerChar === displayChar) {
        statuses[idx] = 'green';
      } else {
        answerFreq[answerChar] = (answerFreq[answerChar] + 1) || 1;
      }
    }

    for (let idx = 0; idx < 5; idx++) {
      let displayChar = content[idx];
      if (statuses[idx] === 'green') {
        continue;
      }
      // console.log(displayChar, answerFreq, answerFreq[displayChar])
      if (answerFreq[displayChar] >= 1) {
        statuses[idx] = 'yellow';
        answerFreq[displayChar] -= 1;
      } else {
        statuses[idx] = 'black';
      }
    }
  }

  return (
      <div className="Row">{
        statuses.map((st, idx) =>
            <input key={idx} className={`Tile ${st}`} value={content[idx]} readOnly={true}/>
        )
      }</div>
  );
}

function Game({answer, guesses, stage}) {
  return (
      <div className="Game">
        {guesses.map((guess, idx) => <Row key={idx} answer={answer} content={guess}/>)}
        {guesses.length >= GAME_GUESS_LIMIT ? null : <Row answer={''} content={stage.padEnd(5)}/>}
        {guesses.length + 1 >= GAME_GUESS_LIMIT
            ? null
            : Array(GAME_GUESS_LIMIT - guesses.length - 1).fill('').map((guess, idx) => <Row key={idx} answer={''} content={'     '}/>)}
      </div>
  );
}

function Keyboard({charStatuses={}, onFire, disabled}) {
  const rows = ['QWERTYUIOP', 'ASDFGHJKL>', 'ZXCVBNM<'];
  return (
      <div>
        {rows.map((row, rowIdx) =>
            <div key={rowIdx} className={"Row"}>
              {row.split('').map(ch =>
                  <button key={ch}
                          disabled={disabled}
                          className={`Tile ${charStatuses[ch] || 'gray'}`}
                          onClick={() => onFire(ch)}
                  >{ch}</button>
              )}
            </div>
        )}
      </div>
  )
}

// https://www.joshwcomeau.com/react/persisting-react-state-in-localstorage/
function useStickyState(defaultValue, key) {
  const [value, setValue] = React.useState(() => {
    const stickyValue = window.localStorage.getItem(key);
    return stickyValue !== null
        ? JSON.parse(stickyValue)
        : defaultValue;
  });
  React.useEffect(() => {
    window.localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);
  return [value, setValue];
}

function CountdownTimer({text='', target}) {
  function getTimeString() {
    let delta = target - new Date();
    if (delta < 0) {
      delta = 0;
    }
    delta = Math.floor(delta / 1000)
    let seconds = delta % 60;
    delta = Math.floor(delta / 60);
    let minutes = delta % 60;
    delta = Math.floor(delta / 60);
    let hours = delta;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  const [countString, setCountString] = useState(getTimeString);

  useEffect(() => {
    const timer = setInterval(() => setCountString(getTimeString()), 1000);
    return () => clearInterval(timer);
  }, []);

  return <h2>{text}{countString}</h2>
}

function App() {
  const [answers, setAnswers] = useState({main: '', clue: '', components: Array(5).fill('')});
  const [dictionary, setDictionary] = useState(new Set());
  const [curGameIdx, setCurGameIdx] = useStickyState(0, 'gameIdx');
  const [guessesByGame, setGuessesByGame] = useStickyState(
      Array(5)
          .fill('')
          .map(() => []), 'guesses');
          // .map(() => ['SCOOP', 'SNAIL', 'APART', 'GROGG']));
          // .map(() => Array(4).fill('WOWZA')));
  const [stageByGame, setStageByGame] = useStickyState(Array(5).fill(''), 'stage');

  const [gameOverText, setGameOverText] = useState('');

  useEffect(() => {
    if (answers.main === '') {
      return;
    }
    let prev = localStorage['prevAnswer'];
    if (prev === '') {
      localStorage['prevAnswer'] = answers.main;
    } else if (prev !== answers.main) {
      setCurGameIdx(0);
      setGuessesByGame(Array(5).fill('').map(() => []));
      setStageByGame(Array(5).fill(''));
      localStorage['prevAnswer'] = answers.main;
    }
  },[answers, setCurGameIdx, setGuessesByGame, setStageByGame]);

  useEffect(() => {
    let allDone = answers.main !== '' && guessesByGame.every((gameGuesses, gameIdx) =>
        (gameGuesses.length === GAME_GUESS_LIMIT
            || gameGuesses[gameGuesses.length - 1] === answers.components[gameIdx]));
    if (allDone) {
      // Did we win?
      if (guessesByGame.every((gameGuesses, gameIdx) => gameGuesses[gameGuesses.length - 1] === answers.components[gameIdx])) {
        setGameOverText('Chicken Dinner!');
      } else {
        setGameOverText('Try again tomorrow!');
      }
    }
  }, [answers, guessesByGame]);

  const keyboardStatusByGame = useMemo(() => {
    return Array(answers.components.length).fill('').map((_, gameIdx) => {
      let answer = answers.components[gameIdx];
      let charStatus = {};

      for (let idx = 0; idx < answer.length; idx++) {
        let answerChar = answer[idx];
        if (charStatus[answerChar] === 'green') {
          continue;
        }
        for (let guess of guessesByGame[gameIdx]) {
          if (answerChar === guess[idx]) {
            charStatus[answerChar] = 'green';
            break;
          }
        }
      }

      for (let guess of guessesByGame[gameIdx]) {
        for (let ch of guess) {
          if (charStatus[ch] === undefined) {
            charStatus[ch] = (answer.indexOf(ch) >= 0) ? 'yellow' : 'black';
          }
        }
      }
      return charStatus;
    });
  }, [answers, guessesByGame]);

  // Run once, on startup
  useEffect(() => {
    fetch('/words.txt')
        .then(resp => resp.text())
        .then(txt => txt.split('\n').filter(line => line.length > 0))
        .then(list => new Set(list))
        .then(setDictionary);

    fetch('/days.json')
        .then(resp => resp.text())
        .then(txt => txt.split('\n').filter(line => line.length > 0))
        .then(lines => {
          let day = Math.floor((Date.now() / 1000 / 60 / 60 - 8) / 24) % lines.length;
          console.log('day', day)
          let [main, clue, components] = JSON.parse(lines[day]);
          return {main, clue, components};
        })
        // .then(selectAnswers)
        .then(setAnswers);
  }, []);

  function stageLetter(gameIdx, letter) {
    if (gameIdx < 0) {
      return;
    }
    setStageByGame(stageByGame.map((stage, stageIdx) => {
      if (gameIdx === stageIdx) {
        if (letter === '<') {
          return stage.substring(0, stage.length-1);
        } else if (letter === '>') {
          if (stage.length === 5 && guessesByGame[gameIdx].length < GAME_GUESS_LIMIT) {
            // TODO: verify against dictionary
            if (!dictionary.has(stage)) {
              return stage;
            }
            setGuessesByGame(guessesByGame.map((guessed, guessIdx) =>
                guessIdx === gameIdx ? guessed.concat(stage) : guessed));
            return '';
          }
        } else if (stage.length < 5 && ALPHABET.indexOf(letter) >= 0) {
          return stage + letter;
        }
      }
      return stage;
    }));
  }

  function onKey(event) {
    if (event.ctrlKey) return;
    switch (event.key) {
      case 'Enter':
        stageLetter(curGameIdx, '>');
        break;

      case 'Backspace':
        stageLetter(curGameIdx, '<');
        break;

      case 'Tab':
        setCurGameIdx(gameIdx => event.shiftKey
          ? Math.max(0, gameIdx - 1)
          : Math.min(4, gameIdx + 1));
        break;

      case 'ArrowLeft':
        setCurGameIdx(gameIdx => Math.max(0, gameIdx - 1))
        break;

      case 'ArrowRight':
        setCurGameIdx(gameIdx => Math.min(4, gameIdx + 1))
        break;

      default:
        if (ALPHABET.indexOf(event.key.toUpperCase()) < 0) {
          return;
        }
        stageLetter(curGameIdx, event.key.toUpperCase());
        break;
    }
    event.preventDefault();
  }

  const topString = useMemo(() =>
      answers.main.split('').map((ch, gameIdx) => {
        for (let guess of guessesByGame[gameIdx]) {
          if (guess[gameIdx] === ch) {
            return ch;
          }
        }
        return ' ';
      }).join(''), [answers, guessesByGame]);

  let txtInput = null;
  useEffect(() => {
    txtInput.focus();
  }, [curGameIdx, txtInput]);

  function getShareText() {
    let green = '🟩';
    let yellow = '🟨';
    let black = '⬛';
    let nums = ['0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣'];

    let ret = [...topString].map(ch => ch == ' ' ? black : green).join('') + '\n';
    ret += guessesByGame.map(guessed => nums[guessed.length]).join('');

    return ret;
  }

  return (
      <div>
        {gameOverText === '' ? null :
            <div className="PopupFrame"
                 onClick={ev => ev.target.className === 'PopupFrame' ? setGameOverText('') : null}>
              <div className="Popup" onClick={ev => ev.preventDefault()}>
                <button className="Close" onClick={() => setGameOverText('')}>╳</button>
                <h1>{gameOverText}</h1>
                <hr/>
                <CountdownTimer
                    text="Next Puzzle: "
                    target={new Date(1000 * 60 * 60 * 24 * (Math.ceil((Date.now() / 1000 / 60 / 60 / 24)) + 8 / 24))}/>
                <hr/>
                <button className="ShareButton" onClick={ev => {
                  navigator.clipboard.writeText(getShareText());
                  setGameOverText(cur => {
                    setGameOverText('Copied!');
                    setTimeout(() => setGameOverText(cur), 1000);
                  });
                  ev.preventDefault();
                }} disabled={gameOverText === 'Copied!'}>Share
                </button>
              </div>
            </div>}
        <div className="App" onKeyDown={onKey} tabIndex={-1} ref={(r) => txtInput = r}>
          <h1 className="Clue">{answers.clue}</h1>
          <Row answer={answers.main === '' ? 'LOADING' : answers.main}
               content={answers.main === '' ? 'LOADING' : topString}/>
          <div className="PlayAreaScroll">
            <div className="PlayArea">
              {answers.components.map((ans, gameIdx) =>
                  <div key={gameIdx} className={curGameIdx === gameIdx ? 'curGame' : ''}
                       onClick={() => setCurGameIdx(gameIdx)}>
                    <h2>Letter {gameIdx + 1}</h2>
                    <Game answer={ans} guesses={guessesByGame[gameIdx] || []} stage={stageByGame[gameIdx]}/>
                  </div>)}
            </div>
          </div>
          {/*<input*/}
          {/*       style={({'fontSize': '2em', width: '8ch'})}*/}
          {/*       maxLength={5}*/}
          {/*       value={stageByGame[curGameIdx]}*/}
          {/*       onSubmit={() => stageLetter(curGameIdx, '>')}/>*/}
          <Keyboard
              disabled={answers.main === '' || curGameIdx < 0}
              charStatuses={keyboardStatusByGame[curGameIdx]}

              onFire={char => stageLetter(curGameIdx, char)}/>
        </div>
      </div>
  );
}

export default App;
