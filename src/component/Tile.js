import React from 'react';
import './Tile.css';

class Tile extends React.Component {

  constructor(props) {
    super(props);
  }

  render() {
    return (
        <input className={this.props.status + " Tile"} defaultValue={this.props.letter} maxLength={1} pattern="[A-Z]{0,1}" onChange={this.props.onChange}/>
    )
  }
}

export default Tile;