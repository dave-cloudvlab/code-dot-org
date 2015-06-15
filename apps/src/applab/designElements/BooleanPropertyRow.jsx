var React = require('react');

var BooleanPropertyRow = React.createClass({
  propTypes: {
    initialValue: React.PropTypes.bool.isRequired,
    handleChange: React.PropTypes.func
  },

  getInitialState: function () {
    return {
      isChecked: this.props.initialValue
    };
  },

  handleClick: function () {
    var checked = !this.state.isChecked;
    this.props.handleChange(checked);
    this.setState({isChecked: checked});
  },

  render: function () {
    var classes = 'custom-checkbox fa';
    if (this.state.isChecked) {
      classes += ' fa-check-square-o';
    } else {
      classes += ' fa-square-o';
    }

    var style = {
      width: 20,
      height: 20,
      fontSize: 20
    };

    return (
      <tr>
        <td>{this.props.desc}</td>
        <td>
          <div
            className={classes}
            style={style}
            onClick={this.handleClick}/>
        </td>
      </tr>
    );
  }
});

module.exports = BooleanPropertyRow;
