import { Component, type ReactNode } from "react";
import { Text } from "react-native";

/** Stands in for the app's error boundary: shows `caught: <message>` when a child throws. */
export class Boundary extends Component<{ children: ReactNode }, { message?: string }> {
  state: { message?: string } = {};
  static getDerivedStateFromError(error: Error) {
    return { message: error.message };
  }
  render() {
    return this.state.message ? <Text>{`caught: ${this.state.message}`}</Text> : this.props.children;
  }
}
