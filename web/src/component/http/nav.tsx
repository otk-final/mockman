import { HomeOutlined } from "@ant-design/icons"
import { Breadcrumb, Input, Typography } from "antd"
import { useState } from "react"

export interface NavPath {
    label: string
    value: string
}

export const NavBreadcrumb: React.FC<{ parent: NavPath, child: NavPath, onChildChange: (child: NavPath) => void, onParentChange: (parent: NavPath) => void }> = ({ parent, child, onChildChange, onParentChange }) => {
    return <Breadcrumb style={{ height: 20, width: '100%' }} >
        <Breadcrumb.Item><HomeOutlined /></Breadcrumb.Item>
        <EditBreadcrumbItem value={parent} onChange={onParentChange} />
        <EditBreadcrumbItem value={child} onChange={onChildChange} />
    </Breadcrumb>
}


const EditBreadcrumbItem: React.FC<{ value: NavPath, onChange: (path: NavPath) => void }> = ({ value, onChange }) => {
    const [editable, setEditable] = useState<boolean>(false)
    const [state, setState] = useState<NavPath>({ ...value })
    const handleBlur = () => {
        if (state.label === "") {
            return
        }
        setEditable(false)
        onChange(state)
    }

    return <Breadcrumb.Item>
        {editable ? <Input placeholder={"required"} value={state.label} width={100} onChange={(e) => setState({ ...state, label: e.target.value })} onBlur={handleBlur} autoFocus /> : <Typography.Text onClick={() => setEditable(true)}>{state.label}</Typography.Text>}
    </Breadcrumb.Item>
}