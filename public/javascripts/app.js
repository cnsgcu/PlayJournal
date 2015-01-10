var App = {
    start: function(gameUrl) {
        var Fleet = [
                {
                    body: [
                        {x: 2, y: 0},
                        {x: 1, y: 1}, {x: 2, y: 1}, {x: 3, y: 1},
                        {x: 1, y: 2}, {x: 2, y: 2}, {x: 3, y: 2},
                        {x: 2, y: 3}
                    ]
                },
                {
                    body: [
                        {x: 10, y: 1},
                        {x: 9, y: 2}, {x: 10, y: 2}, {x: 11, y: 2},
                        {x: 9, y: 3}, {x: 10, y: 3}, {x: 11, y: 3},
                        {x: 10, y: 4}
                    ]
                },
                {
                    body: [
                        {x: 4, y: 14},
                        {x: 3, y: 15}, {x: 4, y: 15}, {x: 5, y: 15},
                        {x: 3, y: 16}, {x: 4, y: 16}, {x: 5, y: 16},
                        {x: 4, y: 17}
                    ]
                },
                {
                    body: [
                        {x: 11, y: 9},
                        {x: 10, y: 10}, {x: 11, y: 10}, {x: 12, y: 10},
                        {x: 10, y: 11}, {x: 11, y: 11}, {x: 12, y: 11},
                        {x: 11, y: 12}
                    ]
                },
                {
                    body: [
                        {x: 1, y: 9},
                        {x: 2, y: 8}, {x: 2, y: 9}, {x: 2, y: 10},
                        {x: 3, y: 8}, {x: 3, y: 9}, {x: 3, y: 10},
                        {x: 4, y: 9}
                    ]
                },
                {
                    body: [
                        {x: 17, y: 4},
                        {x: 18, y: 3}, {x: 18, y: 4}, {x: 18, y: 5},
                        {x: 19, y: 3}, {x: 19, y: 4}, {x: 19, y: 5},
                        {x: 20, y: 4}
                    ]
                },
                {
                    body: [
                        {x: 19, y: 12},
                        {x: 20, y: 11}, {x: 20, y: 12}, {x: 20, y: 13},
                        {x: 21, y: 11}, {x: 21, y: 12}, {x: 21, y: 13},
                        {x: 22, y: 12}
                    ]
                },
                {
                    body: [
                        {x: 13, y: 17},
                        {x: 14, y: 16}, {x: 14, y: 17}, {x: 14, y: 18},
                        {x: 15, y: 16}, {x: 15, y: 17}, {x: 15, y: 18},
                        {x: 16, y: 17}
                    ]
                }
            ],
            PlayerShots = [],
            Playable = false,
            Dispatcher = {
                // TODO make dispatcher like REST
                count: 0,
                route: [],
                register: function(handler, id) {
                    if (id) {
                        this.route[id] = handler;
                    } else {
                        this.route[this.count] = handler;
                        this.count += 1;
                    }
                },
                dispatch: function(id, args) {
                    return this.route[id].apply(this, args);
                }
            },
            Controller = {
                initShip: function() {
                    for (var i = 0; i < Fleet.length; i++) {
                        var ship = Fleet[i].body;

                        for (var j = 0; j < ship.length; j++) {
                            Dispatcher.dispatch(25 * ship[j].y + ship[j].x, ["gray"]);
                        }
                    }
                },
                inspectShots: function(shots) {
                    var shots = shots.map(function(s) {
                        return 25 * s.y + s.x;
                    });

                    PlayerShots.forEach(function (s) {
                        if (shots.indexOf(s) === -1) {
                            Dispatcher.dispatch(500 + s, [""]);
                        } else {
                            Dispatcher.dispatch(500 + s, ["blue"]);
                        }
                    });
                },
                inspectShips: function(shots) {
                    var shots = shots.map(function(s) {
                        return 25 * s.y + s.x;
                    });

                    var hitShips = [];

                    for (var i = 0; i < shots.length; i++) {
                        SHIP_SCAN: for (var unitId = 0; unitId < Fleet.length; unitId++) {
                            var ship = Fleet[unitId].body.map(function(bf) {
                                return 25 * bf.y + bf.x
                            });

                            for (var partId = 0; partId < ship.length; partId++) {
                                if (shots[i] === ship[partId]) {
                                    if (hitShips.indexOf(unitId) === -1) {
                                        hitShips.push(unitId);
                                        break SHIP_SCAN;
                                    }
                                }
                            }
                        }
                    }

                    hitShips.sort().reverse().forEach(this.deleteShip);
                },
                deleteShip: function(si) {
                    var ship = Fleet[si].body;

                    for (var ci = 0; ci < ship.length; ci++) {
                        Dispatcher.dispatch(25 * ship[ci].y + ship[ci].x, [""]);
                    }

                    Fleet.splice(si, 1);
                }
            };

        var ws = new WebSocket(gameUrl);
        ws.onopen = function () {
            ws.send(JSON.stringify(Fleet));
        };

        ws.onmessage = function (msg) {
            var data = JSON.parse(msg.data);
            Playable = data["turn"];

            Dispatcher.dispatch("UPDATE_GAME_INFO", [data["shot"].length]);

            if (Playable) {
                Controller.inspectShips(data["shot"]);
            } else {
                Controller.inspectShots(data["shot"]);
            }

            while(PlayerShots.length > 0) {
                PlayerShots.pop();
            }
        };

        var GameInfo = React.createClass({
            updateGameInfo: function (hit) {
                if (Playable) {
                    this.setState({
                        round: this.state.round + 1,
                        player: this.state.player - hit,
                        opponent: this.state.opponent
                    });
                } else {
                    this.setState({
                        round: this.state.round + 1,
                        player: this.state.player,
                        opponent: this.state.opponent - hit
                    });
                }
            },
            getInitialState: function () {
                return {round: 0, player: 8, opponent: 8};
            },
            render: function () {
                var infoStyle = {
                    textAlign: "center"
                };

                Dispatcher.register(this.updateGameInfo, "UPDATE_GAME_INFO");

                return (
                    <div>
                        <div style={infoStyle}>
                            {this.state.player} vs {this.state.opponent}
                        </div>
                        <div style={infoStyle}>
                            {(this.state.round == 0) ?  'Waiting' : 'Round ' + this.state.round}
                        </div>
                    </div>
                );
            }
        });

        var Cell = React.createClass({
            placeShot: function () {
                if (this.props.shots && Playable) {
                    if (this.state.color === "" && this.props.shots.length < Fleet.length) {
                        this.props.shots.push(this.props.index);

                        this.setBackground("red");
                    } else if (this.state.color === "red")  {
                        this.props.shots.splice(this.props.shots.indexOf(this.props.index), 1);

                        this.clearBackground();
                    }
                }
            },
            setBackground: function(bgColor) {
                this.setState({color: bgColor});
            },
            clearBackground: function () {
                this.setBackground("");
            },
            getInitialState: function () {
                return {color: ""};
            },
            render: function () {
                Dispatcher.register(this.setBackground);

                var initBgColor = {
                    backgroundColor: this.state.color
                };

                return (
                    <div className="cell" onClick={this.placeShot} style={initBgColor}></div>
                );
            }
        });

        var PlayerBoard = React.createClass({
            render: function () {
                var board = [];

                for (var i = 0; i < this.props.cellNum; i++) {
                    board.push(<Cell index={i} />);
                }

                return (
                    <div className="board">
                        {board}
                    </div>
                );
            }
        });

        var OpponentBoard = React.createClass({
            render: function () {
                var board = [];

                for (var i = 0; i < this.props.cellNum; i++) {
                    board.push(<Cell index={i} shots={this.props.shots} />);
                }

                return (
                    <div className="board">
                        {board}
                    </div>
                );
            }
        });

        var GamePlay = React.createClass({
            fireShots: function () {
                if (Playable && PlayerShots.length === Fleet.length) {
                    var shots = PlayerShots.map(function (shot) {
                        return {x: shot % 25, y: Math.floor(shot / 25)};
                    });

                    ws.send(JSON.stringify({shots: shots}));
                }
            },
            render: function () {
                var cellNum = 20 * 25;

                return (
                    <div>
                        <div className="game">
                            <PlayerBoard cellNum={cellNum} />
                            <OpponentBoard cellNum={cellNum} shots={PlayerShots}/>
                        </div>

                        <input type="button" value="Fire!" onClick={this.fireShots} />
                    </div>
                )
            }
        });

        React.render(
            <div>
                <GameInfo />
                <GamePlay />
            </div>,
            document.getElementById("app")
        );

        Controller.initShip();
    }
};

App.start(_GAME_WS_URL_);