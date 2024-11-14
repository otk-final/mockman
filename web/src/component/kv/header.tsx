import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { AutoComplete, AutoCompleteProps, Button, Input, Table, TableColumnsType } from "antd";
import { TableRowSelection } from "antd/lib/table/interface";
import React, { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { KVField } from "../../api/base";

export interface KVHint {
    name: string
    options: string[]
}

export interface KVTableProps {
    data: KVField[]
    hints?: KVHint[]
    fixed?: boolean
}

export interface KVTableHandle {
    replace: (target: KVField) => void
    getData: () => KVField[]
}



const KeyAutoComplete: React.FC<{ value: string, hints: KVHint[], onChange: (val: string) => void }> = ({ value, hints, onChange }) => {
    const [state, setState] = useState<string>(value)
    useEffect(() => {
        setState(value)
    }, [value])

    const [options, setOptions] = React.useState<AutoCompleteProps['options']>([]);
    const handleSearch = (value: string) => {
        const result = hints.filter(e => e.name.toLowerCase().startsWith(value.toLowerCase())).map(e => {
            return { lable: e.name, value: e.name }
        })
        setOptions(result)
        handleChange(value)
    }

    const handleChange = (value: string) => {
        setState(value)
        onChange(value)
    }

    return <AutoComplete style={{ width: '100%' }} bordered={false} placeholder="Key" value={state} onChange={handleChange} options={options} onSearch={handleSearch} onSelect={handleChange} />
}


const ValueAutoComplete: React.FC<{ value: string, hints: KVHint[], onChange: (val: string) => void, getKey: () => string }> = ({ value, hints, onChange, getKey }) => {

    const [state, setState] = useState<string>(value)
    useEffect(() => {
        setState(value)
    }, [value])

    const [options, setOptions] = useState<AutoCompleteProps['options']>([]);
    const handleSearch = (value: string) => {
        //获取key
        const key = getKey()
        const result = hints.filter(e => e.name.toLowerCase() === key.toLowerCase()).flatMap(e => e.options).filter(e => e.toLowerCase().startsWith(value.toLowerCase())).map(e => {
            return { lable: e, value: e }
        })
        setOptions(result)
        handleChange(value)
    }

    const handleChange = (value: string) => {
        setState(value)
        onChange(value)
    }

    return <AutoComplete style={{ width: '100%' }} bordered={false} placeholder="Value" value={state} onChange={setState} options={options} onSearch={handleSearch} onSelect={onChange} />
}

const DescriptionInput: React.FC<{ value?: string, onChange: (val: string) => void }> = ({ value, onChange }) => {
    const [state, setState] = useState<string>(value || '')

    const handleChange = (value: string) => {
        setState(value)
        onChange(value)
    }

    return <Input bordered={false} placeholder="Description" value={state} onChange={(e) => handleChange(e.target.value)} />
}



export const KVTable = forwardRef<KVTableHandle, KVTableProps>(({ data, hints = [], fixed = false }, ref) => {
    const [state, setData] = useState<KVField[]>(data)
    const [selected, setSelected] = useState<React.Key[]>([]);

    //暴露数据
    useImperativeHandle(ref, () => ({
        getData: () => {
            return state.map((e, idx) => {
                return { ...e, selected: selected.includes(idx) }
            })
        },
        replace: (target: KVField) => {
            let tempArr = [...state]
            const kv = tempArr.find(e => e.key.toLowerCase() === target.key.toLowerCase())
            if (!kv) {
                //不存在添加
                tempArr.push({ ...target, index: tempArr.length })
            } else {
                //存在替换
                tempArr = tempArr.map((e, idx) => {
                    if (e.key.toLowerCase() === target.key.toLowerCase()) {
                        return { ...target, index: idx }
                    }
                    return { ...e, index: idx }
                })
            }
            setData(tempArr)
        }
    }))

    //初始化
    useEffect(() => {
        setData(data)
        setSelected(data.filter(e => e.selected).map((_, idx) => idx))
    }, [data])



    const rowSelection: TableRowSelection<KVField> = {
        selectedRowKeys: selected,
        onChange: setSelected,
    };

    const handleChange = (index: number, field: string, val: string | boolean) => {
        state[index] = { ...state[index], [field]: val }
        setData([...state])
    }

    const handleRemove = (index: number) => {
        state.splice(index, 1)
        setData([...state])
    }


    const handleAppend = () => {
        state.push({ index: state.length + 1, key: "", value: "" })
        setData([...state])
    }

    const KVColumns: TableColumnsType<KVField> = [
        {
            key: 'key', title: "Key", width: '33%', render: (_, record, index) => {
                return <KeyAutoComplete onChange={(e) => handleChange(index, 'key', e)} value={record.key} hints={hints} />
            },
        },
        {
            key: 'value', title: 'Value', width: '33%', render: (_, record, index) => {
                return <ValueAutoComplete onChange={(e) => handleChange(index, 'value', e)} key={record.key} value={record.value} hints={hints} getKey={() => state[index].key} />
            },
        },
        {
            key: 'description', title: 'Description', width: '33%', render: (_, record, index) => {
                return <DescriptionInput value={record.description} onChange={(e) => handleChange(index, 'description', e)} />
            },
        },
        {
            key: 'action', title: <Button icon={<PlusOutlined />} type={'text'} onClick={handleAppend} disabled={fixed}></Button>, width: '33%', render: (_, record, index) => {
                return <Button icon={<DeleteOutlined />} type={'text'} onClick={() => handleRemove(index)} disabled={fixed}></Button>
            },
        }
    ]

    return <Table
        bordered
        pagination={false}
        columns={KVColumns}
        dataSource={state}
        rowKey={"index"}
        size={"small"}
        rowSelection={rowSelection}></Table>
})
