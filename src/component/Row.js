import React from 'react';
import Tile from "./Tile";
import './Row.css';

class Row extends React.Component {

  constructor(props) {
    super(props);
  }

  render() {
    let statuses = [...Array(5).fill('black')];

    let answerFreq = {};
    // let displayFreq = {};

    for (let idx = 0; idx < 5; idx++) {
      let answerChar = this.props.answer[idx];
      let displayChar = this.props.display[idx];

      if (answerChar === displayChar) {
        statuses[idx] = 'green';
      } else {
        answerFreq[answerChar] = (answerFreq[answerChar] + 1) || 1;
        // displayFreq[displayChar] = (displayFreq[displayChar] + 1) || 1;
      }
    }

    for (let idx = 0; idx < 5; idx++) {
      let displayChar = this.props.display[idx];
      if (statuses[idx] === 'green') {
        continue;
      }
      console.log(displayChar, answerFreq, answerFreq[displayChar])
      if (answerFreq[displayChar] >= 1) {
        statuses[idx] = 'yellow';
        answerFreq[displayChar] -= 1;
      }
    }

    return (
        <div className="Row">{
          statuses.map((st, idx) =>
              <Tile key={idx} status={st} letter={this.props.display[idx]}/>
          )
        }</div>
    );
  }

}

export default Row;