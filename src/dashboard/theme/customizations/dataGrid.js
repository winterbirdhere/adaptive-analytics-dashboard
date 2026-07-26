import { paperClasses } from '@mui/material/Paper';
import { alpha } from '@mui/material/styles';

import { menuItemClasses } from '@mui/material/MenuItem';
import { listItemIconClasses } from '@mui/material/ListItemIcon';
import { iconButtonClasses } from '@mui/material/IconButton';
import { checkboxClasses } from '@mui/material/Checkbox';
import { listClasses } from '@mui/material/List';
import { gridClasses } from '@mui/x-data-grid';
import { tablePaginationClasses } from '@mui/material/TablePagination';
import { gray } from '../../../shared-theme/themePrimitives';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
import { createElement } from 'react';

const UnsortedIcon = () => createElement(UnfoldMoreIcon, { fontSize: 'small' });


export const dataGridCustomizations = {
  MuiDataGrid: {
    defaultProps: {
      slots: {
        columnUnsortedIcon: UnsortedIcon,
      },
    },
    styleOverrides: {
      root: ({ theme }) => ({
        '--DataGrid-overlayHeight': '300px',
        overflow: 'clip',
        borderColor: (theme.vars || theme).palette.divider,
        backgroundColor: (theme.vars || theme).palette.background.default,
        [`& .${gridClasses.columnHeader}`]: {
          backgroundColor: (theme.vars || theme).palette.background.paper,
          /* Show sort + menu on hover */
          '&:hover .MuiDataGrid-iconButtonContainer, &:hover .MuiDataGrid-menuIcon': {
            opacity: 1,
            transition: 'opacity 50ms ease-in',
          },
          /* Ensure [menu][sort] order for left-aligned columns */
          '& .MuiDataGrid-menuIcon': {
            order: '1 !important',
          },
          '& .MuiDataGrid-iconButtonContainer': {
            order: '2 !important',
          },
          /* Right-aligned (numeric) columns: icons appear on the left,
             so we reverse the order to keep [menu][sort] visually */
          '&.MuiDataGrid-columnHeader--alignRight .MuiDataGrid-menuIcon': {
            order: '2 !important',
          },
          '&.MuiDataGrid-columnHeader--alignRight .MuiDataGrid-iconButtonContainer': {
            order: '1 !important',
          },
        },
        [`& .${gridClasses.footerContainer}`]: {
          backgroundColor: (theme.vars || theme).palette.background.paper,
        },
        [`& .${checkboxClasses.root}`]: {
          padding: theme.spacing(0.5),
          '& > svg': {
            fontSize: '1rem',
          },
        },
        [`& .${tablePaginationClasses.root}`]: {
          marginRight: theme.spacing(1),
          '& .MuiIconButton-root': {
            maxHeight: 32,
            maxWidth: 32,
            '& > svg': {
              fontSize: '1rem',
            },
          },
        },
      }),
      cell: ({ theme }) => ({
        borderTopColor: (theme.vars || theme).palette.divider,
      }),
      menu: ({ theme }) => ({
        borderRadius: theme.shape.borderRadius,
        backgroundImage: 'none',
        [`& .${paperClasses.root}`]: {
          border: `1px solid ${(theme.vars || theme).palette.divider}`,
        },
        [`& .${menuItemClasses.root}`]: {
          margin: '0 4px',
        },
        [`& .${listItemIconClasses.root}`]: {
          marginRight: 0,
        },
        [`& .${listClasses.root}`]: {
          paddingLeft: 0,
          paddingRight: 0,
        },
      }),
      row: ({ theme }) => ({
        '&:last-of-type': {
          borderBottom: `1px solid ${(theme.vars || theme).palette.divider}`,
        },
        '&:hover': {
          backgroundColor: (theme.vars || theme).palette.action.hover,
        },
        '&.Mui-selected': {
          background: (theme.vars || theme).palette.action.selected,
          '&:hover': {
            backgroundColor: (theme.vars || theme).palette.action.hover,
          },
        },
      }),
      iconButtonContainer: ({ theme }) => ({
        [`& .${iconButtonClasses.root}`]: {
          border: 'none',
          backgroundColor: 'transparent',
          '&:hover': {
            backgroundColor: alpha(theme.palette.action.selected, 0.3),
          },
          '&:active': {
            backgroundColor: gray[200],
          },
          ...theme.applyStyles('dark', {
            color: gray[50],
            '&:hover': {
              backgroundColor: gray[800],
            },
            '&:active': {
              backgroundColor: gray[900],
            },
          }),
        },
      }),
      menuIconButton: ({ theme }) => ({
        border: 'none',
        backgroundColor: 'transparent',
        '&:hover': {
          backgroundColor: gray[100],
        },
        '&:active': {
          backgroundColor: gray[200],
        },
        ...theme.applyStyles('dark', {
          color: gray[50],
          '&:hover': {
            backgroundColor: gray[800],
          },
          '&:active': {
            backgroundColor: gray[900],
          },
        }),
      }),
      filterForm: ({ theme }) => ({
        gap: theme.spacing(1),
        alignItems: 'flex-end',
      }),
      columnsManagementHeader: ({ theme }) => ({
        paddingRight: theme.spacing(3),
        paddingLeft: theme.spacing(3),
      }),
      columnHeaderTitleContainer: {
        flexGrow: 1,
        /* display:contents flattens this container so its children
           participate in the draggableContainer flex layout */
        display: 'contents !important',
      },
      columnHeaderDraggableContainer: {
        paddingRight: 2,
        display: 'flex',
        alignItems: 'center',
        /* Order: [title(0)] [??menu(1)] [??sort(2)] */
        '& .MuiDataGrid-columnHeaderTitleContainerContent': {
          order: 0,
          flex: 1,
          overflow: 'hidden',
        },
        '& .MuiDataGrid-menuIcon': {
          order: 1,
        },
        '& .MuiDataGrid-iconButtonContainer': {
          order: 2,
        },
        /* Hide sort + menu via opacity when not hovering */
        '& .MuiDataGrid-iconButtonContainer, & .MuiDataGrid-menuIcon': {
          opacity: 0,
          transition: 'opacity 100ms ease-out',
        },
      },
    },
  },
};
