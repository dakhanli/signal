import {
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle
} from "@material-ui/core"
import { Alert } from "@material-ui/lab"
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

export const MIDIDeviceDialog: FC = () => {
  const { midiDeviceStore, rootViewStore } = useStores()

  const {
    inputs,
    outputs,
    isLoading,
    requestError,
    isOpen,
    enabledInputIds,
    enabledOutputIds,
  } = useObserver(() => ({
    inputs: midiDeviceStore.inputs,
    outputs: midiDeviceStore.outputs,
    isLoading: midiDeviceStore.isLoading,
    requestError: midiDeviceStore.requestError,
    enabledInputIds: midiDeviceStore.enabledInputIds,
    enabledOutputIds: midiDeviceStore.enabledOutputIds,
    isOpen: rootViewStore.openDeviceDialog,
  }))

  const close = () => (rootViewStore.openDeviceDialog = false)

  const formatName = (device: WebMidi.MIDIPort) =>
    (device?.name ?? "") +
    ((device.manufacturer?.length ?? 0) > 0 ? `(${device.manufacturer})` : "")

  const portToDevice = (device: WebMidi.MIDIPort): Device => ({
    id: device.id,
    name: formatName(device),
    isConnected: device.state === "connected",
  })

  const inputDevices = inputs.map((device) => ({
    device: portToDevice(device),
    isSelected: enabledInputIds.has(device.id),
  }))

  const outputDevices = outputs.map((device) => ({
    device: portToDevice(device),
    isSelected: enabledOutputIds.has(device.id),
  }))

  const factorySound: Device = {
    id: "signal-midi-app",
    name: "Signal Factory Sound",
    isConnected: true,
  }

  return (
    <Dialog open={isOpen} onClose={close}>
      <DialogTitle>{localized("midi-settings", "MIDI Settings")}</DialogTitle>
      <DialogContent>
        {isLoading && <CircularProgress />}
        {requestError && (
          <>
            <Alert severity="warning">{requestError.message}</Alert>
            <Spacer />
          </>
        )}
        {!isLoading && (
          <>
            <DialogContentText>
              {localized("inputs", "Inputs")}
            </DialogContentText>
            <DeviceList>
              {inputDevices.map(({ device, isSelected }) => (
                <DeviceRow
                  key={device.id}
                  device={device}
                  isSelected={isSelected}
                  onCheck={(checked) =>
                    midiDeviceStore.setInputEnable(device.id, checked)
                  }
                />
              ))}
            </DeviceList>
            <Spacer />
            <DialogContentText>
              {localized("outputs", "Outputs")}
            </DialogContentText>
            <DeviceList>
              {outputDevices.map(({ device, isSelected }) => (
                <DeviceRow
                  key={device.id}
                  device={device}
                  isSelected={isSelected}
                  onCheck={(checked) =>
                    midiDeviceStore.setOutputEnable(device.id, checked)
                  }
                />
              ))}
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
