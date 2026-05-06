import { createContext, useContext } from 'react'

export interface WorkbenchContextValue {
  inWorkbenchPanel: boolean
  openWorkbenchPanel: (panel: string) => void
  compactWorkbench: boolean
}

const WorkbenchContext = createContext<WorkbenchContextValue>({
  inWorkbenchPanel: false,
  openWorkbenchPanel: () => {},
  compactWorkbench: false,
})

export function WorkbenchProvider({
  value,
  children,
}: {
  value: WorkbenchContextValue
  children: React.ReactNode
}) {
  return <WorkbenchContext.Provider value={value}>{children}</WorkbenchContext.Provider>
}

export function useWorkbench() {
  return useContext(WorkbenchContext)
}
