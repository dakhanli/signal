import {
  Button,
  Checkbox,

  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle
} from "@material-ui/core"
import { useObserver } from "mobx-react-lite"
import React, { FC } from "react"
import styled from "styled-components"
import { localized } from "../../../common/localize/localizedString"
import { useStores } from "../../hooks/useStores"

interface Device {
  id: string
  name: string
  isConnected: boolean
}

interface ListItem {
  device: Device
  isSelected: boolean
  onCheck: (isChecked: boolean) => void
}

const DeviceRowWrapper = styled.div`
  display: flex;
  align-items: center;
`

const DeviceRow: FC<ListItem> = ({ device, isSelected, onCheck }) => {
  return (
    <DeviceRowWrapper>
      <Checkbox
        color="primary"
        checked={isSelected}
        onChange={(e) => onCheck(e.currentTarget.checked)}
      />
      {device.name}
      {!device.isConnected && " (disconnected)"}
    </DeviceRowWrapper>
  )
}

const DeviceList = styled.div``

const Spacer = styled.div`
  height: 2rem;
`

export const SoundDeviceDialog: FC = () => {
  const { soundDeviceStore, rootViewStore } = useStores()

  const {
    isOpen,
    isFactorySoundEnabled,
  } = useObserver(() => ({
    isFactorySoundEnabled: soundDeviceStore.isFactorySoundEnabled,
    isOpen: rootViewStore.openSoundDeviceDialog,
  }))

  const close = () => (rootViewStore.openSoundDeviceDialog = false)

  const formatName = (device: WebMidi.MIDIPort) =>
    (device?.name ?? "") +
    ((device.manufacturer?.length ?? 0) > 0 ? `(${device.manufacturer})` : "")

  const portToDevice = (device: WebMidi.MIDIPort): Device => ({
    id: device.id,
    name: formatName(device),
    isConnected: device.state === "connected",
  })


  const factorySound: Device = {
    id: "signal-midi-app",
    name: "Signal Factory Sound",
    isConnected: true,
  }

  return (
    <Dialog open={isOpen} onClose={close}>
      <DialogTitle>{localized("sound-device-settings", "Sound Devices")}</DialogTitle>
      <DialogContent>
        {(
          <>
            <DialogContentText>
              {localized("device-list", "Devices")}
            </DialogContentText>
            <DeviceList>
              <DeviceRow
                device={factorySound}
                isSelected={isFactorySoundEnabled}
                onCheck={(checked) =>
                  (soundDeviceStore.isFactorySoundEnabled = checked)
                }
              />
            </DeviceList>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={close}>{localized("close", "Close")}</Button>
      </DialogActions>
    </Dialog>
  )
}
