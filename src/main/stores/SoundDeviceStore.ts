import { makeObservable, observable } from "mobx"

export class SoundDeviceStore {
  isFactorySoundEnabled = true

  constructor() {
    makeObservable(this, {
      isFactorySoundEnabled: observable,
    })
  }
  
}
