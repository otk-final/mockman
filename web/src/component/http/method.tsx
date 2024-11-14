import { Select, Tag } from "antd"
import { useState } from "react"
import { METHOD_COLORS } from "../../api/constant"
import { Option } from "antd/es/mentions"

export const MethodAddon: React.FC<{ value: string, onChange: (value: string) => void }> = ({ value, onChange }) => {
    const [method, setMethod] = useState<string>(value)

    const handleChange = (e: string) => {
        setMethod(e)
        onChange(e)
    }

    return <Select defaultValue="GET" value={method} style={{ width: 100 }} onChange={handleChange}>
        {
            Object.keys(METHOD_COLORS).map((e) => {
                return <Option key={e} value={e}><Tag color={METHOD_COLORS[e]}>{e}</Tag></Option>
            })
        }
    </Select>
}


