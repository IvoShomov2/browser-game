class FiniteStateMachine {
  constructor(owner, initialState) {
    this.owner = owner;
    this.currentState = initialState;
    this.states = new Map();
  }

  addState(name, config) {
    this.states.set(name, config);
    return this;
  }

  setState(newState, context = null) {
    if (!this.states.has(newState) || this.currentState === newState) {
      return;
    }

    const previousState = this.states.get(this.currentState);
    if (previousState && previousState.exit) {
      previousState.exit(this.owner, context);
    }

    this.currentState = newState;

    const nextState = this.states.get(this.currentState);
    if (nextState && nextState.enter) {
      nextState.enter(this.owner, context);
    }
  }

  update(game, deltaTime) {
    const stateConfig = this.states.get(this.currentState);
    if (!stateConfig) {
      return;
    }

    if (stateConfig.transitions) {
      for (const transition of stateConfig.transitions) {
        if (transition.condition(this.owner, game)) {
          this.setState(transition.target, game);
          return;
        }
      }
    }

    if (stateConfig.update) {
      stateConfig.update(this.owner, game, deltaTime);
    }
  }

  matches(...states) {
    return states.includes(this.currentState);
  }
}

window.FiniteStateMachine = FiniteStateMachine;
