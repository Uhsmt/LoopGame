export interface GameState {
    onEnter(): void;
    onExit(): void;
    update(delta: number): void;
    render(): void;
}
