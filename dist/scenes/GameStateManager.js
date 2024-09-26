export class GameStateManager {
    constructor(app) {
        this.app = app;
        // for cursor move
        app.stage.eventMode = 'static';
        app.stage.hitArea = app.screen;
    }
    setState(newState) {
        if (this.currentState) {
            this.currentState.onExit();
        }
        this.currentState = newState;
        this.currentState.onEnter();
    }
    update(delta) {
        this.currentState.update(delta);
    }
    render() {
        this.currentState.render();
    }
}
//# sourceMappingURL=GameStateManager.js.map