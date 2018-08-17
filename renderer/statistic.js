import * as React from 'react';

const {ipcRenderer} = require('electron');
const _ = require('lodash');
let remote = require('electron').remote;     
let settings = remote.getGlobal('settings')

class Pack extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        let date = new Date(this.props.pack.createdAt);
        let packDate = `${date.getMonth()+1}.${date.getDate()}.${date.getFullYear()} ${toDouble(date.getHours())}:${toDouble(date.getMinutes())}`;
        let dust = 0;


        let images = this.props.pack.cards.map((card, i) => {
            return (
                <img 
                key={`${card.card.cardId}-${this.props.num}-${i}`}
                src={card.isGolden ? card.card.imgGold : card.card.img} 
                alt={card.card.name} 
                style={{width: '130px'}}/>
            )
        })

        return (
            <li 
            key={'pack'+this.props.num}
            className={this.props.pack.hasLegendary ? 'legendary-pack' : ''}
            >
                <div className="head">
                    <span className="date">{packDate}</span>
                    {this.props.pack.pityTimer}
                    <span className="pack-dust">{this.props.pack.dust}</span>
                </div>
                {images}
            </li>
        )
    }
}

class Board extends React.Component {
    constructor(props) {
        super(props);
    }

    renderPack(pack, i) {
        return (
            <Pack
                pack={pack}
                num={i}
            />
        )
    }
  
    render() {  
        let packs = this.props.packs.map( (pack, i) => {return this.renderPack(pack, i)})

        return (
            <ol key="wtf"
                id="cards"
                className={this.props.isLoading ? 'preload' : ''}
            >
                {packs}
            </ol>
        );
    }
}

class Title extends React.Component {
    render() {
        let set = this.props.set;
        let statistic = '';

        if (set) {
            return (
                <div id="statistic">
                    {`Packs: ${set.quantity} `}<span>{`(Common: ${set.common}, Rare: ${set.rare}, Epic: ${set.epic}, Legendary: ${set.legendary}, Dust in total: ${set.dust})`}</span>
                </div>
            )
        } else {
            return (<div id="statiscic"></div>)
        }
    }
}

class Menu extends React.Component {

    constructor(props) {
        super(props);

        this.sets = [
            {name: "Classic", tag: 'classic'},
            {name: "Goblins vs Gnomes", tag: 'gvg'},
            {name: "The Grand Tournament", tag: 'tgt'},
            {name: "Whispers of the Old Gods", tag: 'wog'},
            {name: "Mean Streets of Gadgetzan", tag: 'msg'},
            {name: "Journey to Un'Goro", tag: 'jtu'},
            {name: "Knights of the Frozen Throne", tag: 'kft'},
            {name: "Kobolds & Catacombs", tag: 'kc'},
            {name: "The Witchwood", tag: "tw"},
            {name: "The Boomsday Project", tag: "bot"}
        ];
    }

    render() {
        let userSets = Object.keys(this.props.avalibleSets);
        let sets = this.sets.filter(set => userSets.indexOf(set.name) >= 0);

        let buttons = sets.map(set => {
            let pityTimer = this.props.avalibleSets[set.name] ? this.props.avalibleSets[set.name].pityTimer : 0;

            return (
                <button 
                    key={set.tag}
                    className={'show-cards ' + set.tag + (this.props.active == set.name ? ' active' : '')}
                    onClick={() => this.props.onClick(set.name)}
                >
                <span className='badge'>{pityTimer}</span>
                </button>
            )
        });

        return (
            <div id="packs" className="aside">
                {buttons}
            </div>
        )
    }
}


export default class Statistic extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            activeSet: null,
            isLoading: false,
            packs: [],
            sets: settings.sets,
        };
    }

    // Binding with main process
    componentDidMount() {
        // Got new set packs after toggle
        ipcRenderer.on('res-set', (event, packs, set) => {
            this.setState({
                isLoading: false,
                packs: packs,
            });
        });

        // New pack opened
        ipcRenderer.on('new-pack', (event, pack) => {
            if (this.state.activeSet == pack.cardSet) {
                let currentSet = this.state.packs.slice();
                
                currentSet.unshift(pack);

                this.setState({
                    packs: currentSet,
                });
            }
        });

        // App data updated
        ipcRenderer.on('data-updated', (event, newSettings) => {
            this.setState({sets: settings.sets})
        });

        // Subscripe to main process events
        ipcRenderer.send('pack-subscribe');
        ipcRenderer.send('data-subscribe');
    }

    render() {
        let bgUrl = false;


        if (this.state.activeSet) {
            let setWords = this.state.activeSet.split(' ');
            let setTags = '';
            
            setWords.forEach(word => {
                setTags += word.charAt(0);
            });

            bgUrl = `url(../assets/images/${setTags.toLowerCase()}-bg.jpg)`;
            
        }
        console.log(bgUrl);

        let divStyle = {
            'backgroundImage': bgUrl || 'none'
        }

        return (
            <div style={divStyle} className="container">
                <div id="heading" className="heading">
                    <div id="title">{this.state.activeSet || 'Hearthstone Packs'}</div>

                    <Title
                        set={this.state.activeSet ? this.state.sets[this.state.activeSet] : null}
                    />
                </div>

                <Menu 
                    active={this.state.activeSet} 
                    onClick={(set) => this.loadSets(set)}
                    avalibleSets={this.state.sets}
                />

                <div className="content">
                    <Board
                        isLoading={this.state.isLoading}
                        packs={this.state.packs}
                    />
                </div>
            </div>
        );
    }

    loadSets (set) {
        if (set == this.state.activeSet) return true;

        this.setState({
            activeSet: set,
            isLoading: true,
            packs: [],
        });

        // Request set from main process
        ipcRenderer.send('get-set', set);
    }
}


const toDouble = function (number) {
    if (number.toString().length < 2) number = '0'+number;
    return number;
}