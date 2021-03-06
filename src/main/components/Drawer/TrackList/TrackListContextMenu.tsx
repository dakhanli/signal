import { Menu, MenuItem } from "@material-ui/core"
import React, { FC } from "react"
import { IPoint } from "../../../../common/geometry"

export interface TrackListContextMenuProps {
  isOpen: boolean
  position: IPoint
  onClickDelete: () => void
  handleClose: () => void
}

export const TrackListContextMenu: FC<TrackListContextMenuProps> = ({
  isOpen,
  position,
  onClickDelete,
  handleClose,
}) => {
  return (
    <Menu
      keepMounted
      open={isOpen}
      onClose={handleClose}
      anchorReference="anchorPosition"
      anchorPosition={{ top: position.y, left: position.x }}
    >
      <MenuItem
        onClick={(e) => {
          e.stopPropagation()
          onClickDelete()
          handleClose()
        }}
      >
        Delete Track
      </MenuItem>
    </Menu>
  )
}
