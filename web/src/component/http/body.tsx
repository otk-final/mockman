import React, { forwardRef, Fragment, useEffect, useImperativeHandle, useRef, useState } from "react";
import { KVTable, KVTableHandle } from "../kv/header";
import { Button, Checkbox, Dropdown, Flex, Image, Input, List, MenuProps, Radio, Space, Tabs, TabsProps, Typography } from "antd";
import { DownOutlined, JavaScriptOutlined } from "@ant-design/icons";
import MonacoEditor from '@monaco-editor/react';
import { editor } from 'monaco-editor';
import { ApiFile, HttpBody, HttpBodyDataType } from "../../api/base";
import { ServerApi } from "../../api";




export interface BodyEditorProps {

    // 支持格式
    schemes: HttpBodyDataType[]

    // 数据
    data: HttpBody
}

export interface BodyEditorHandle {
    getData: () => HttpBody
}



export const BodyEditor = forwardRef<BodyEditorHandle, BodyEditorProps>(({ schemes, data }, ref) => {

    const [scheme, setScheme] = useState<string>(data.dataType)

    //form
    const [formType,] = useState<string>(data.formType)

    //raw
    const [rawType, setRawType] = useState<string>(data.rawType)

    //file
    const [fileType,] = useState<string>(data.fileType)


    const formRef = useRef<KVTableHandle>(null)
    const rawRef = useRef<RawContentEditorHandle>(null)
    const fileRef = useRef<FileListHandle>(null)



    //暴露数据
    useImperativeHandle(ref, () => ({
        getData: () => {
            const result = { ...data, dataType: scheme, formType: formType, fileType: fileType, rawType: rawType } as HttpBody
            if (formRef.current) {
                result.formValue = formRef.current.getData()
            }
            if (rawRef.current) {
                result.rawValue = rawRef.current.getData()
            }
            if (fileRef.current) {
                result.fileValue = fileRef.current.getData()
            }
            return result;
        }
    }))



    const handleChangeRawType = (e: string) => {
        setRawType(e)
        rawRef.current?.handleChangeRawType(e)
    }

    
    const settingTabItems: TabsProps['items'] = [
        {
            key: "raw",
            label:"",
            children: <RawContentEditor type={data.rawType} value={data.rawValue} ref={rawRef} />
        },
        {
            key: "form",
            label: "",
            children: <KVTable data={data.formValue || []} ref={formRef} />
        },
        {
            key: "file",
            label: "",
            children: <FileList value={data.fileValue} ref={fileRef} />
        },
        {
            key: "binary",
            label: "",
            children: <BinaryPreview type={data?.binaryType} value={data?.binaryValue} />
        }
    ]

    return <Flex vertical gap={10} style={{ height: "100%" }}>
        <Flex justify={"space-between"} align={'center'}>
            <Flex gap={5}>
                <Radio.Group value={scheme} onChange={(e) => setScheme(e.target.value)}>
                    {schemes.map((e, idx) => {
                        return <Radio key={idx} value={e}>{e}</Radio>
                    })}
                </Radio.Group>
                {scheme === "raw" && <RawContentTypeDropdown value={rawType} onChange={handleChangeRawType} />}
            </Flex>
            <Button type={"link"} onClick={() => { rawRef.current?.handleBeautify() }} disabled={scheme !== "raw"}>Beautify</Button>
        </Flex>

        <Tabs items={settingTabItems} activeKey={scheme} onChange={(e) => setScheme(e)} style={{ height: '100%' }} />
    </Flex>
})



interface RawContentEditorProps {
    type: string,
    value: string
}

interface RawContentEditorHandle {
    handleBeautify: () => void
    handleChangeRawType: (e: string) => void
    getData: () => string
}

const RawContentEditor = forwardRef<RawContentEditorHandle, RawContentEditorProps>(({ type, value }, ref) => {

    //raw
    const [rawType, setRawType] = useState<string>(type)
    const [rawContent, setRawContent] = useState<string>(value)

    const editRef = useRef<any>()
    const handleMount = (editor: editor.IStandaloneCodeEditor) => {
        editRef.current = editor;
    }

    useImperativeHandle(ref, () => ({
        handleBeautify: () => {
            const editor = editRef.current
            editor.getAction('editor.action.formatDocument').run()
            editor.setValue(editor.getValue())
        },
        handleChangeRawType: (e: string) => {
            setRawType(e)
        },
        getData: () => {
            return rawContent
        }
    }))

    return <List bordered style={{ padding: 5, height: "inherit" }}>
        <MonacoEditor
            height={"inherit"}
            language={rawType}
            value={rawContent}

            theme="vs"
            // path={"/node_modules/monaco-editor/min/vs/loader.js"}
            onChange={(e) => setRawContent(e || "")}
            onMount={handleMount}
            options={{ minimap: { enabled: false }, automaticLayout: true, }}
        />
    </List>
})


const RawContentTypeDropdown: React.FC<{ value: string, onChange: (val: string) => void }> = ({ value, onChange }) => {
    const [state, setState] = useState<string>(value)

    const items: MenuProps['items'] = ["json", "xml", "text", "html"].map(e => {
        return {
            key: e,
            label: e,
            // icon: <JavaScriptOutlined />,
            onClick: () => handleChange(e)
        }
    })

    const handleChange = (e: string) => {
        setState(e)
        onChange(e)
    }

    return <Dropdown menu={{ items }}>
        <a onClick={(e) => e.preventDefault()}>
            <Space>
                {state}
                <DownOutlined />
            </Space>
        </a>
    </Dropdown>
}


interface FileListProps {
    value?: ApiFile
}

interface FileListHandle {
    getData: () => ApiFile | undefined
}


const serverApi = new ServerApi()
const FileList = forwardRef<FileListHandle, FileListProps>(({ value }, ref) => {

    const [chooies, setChooies] = useState<ApiFile[]>([])
    const [state, setSelected] = useState<ApiFile | undefined>(value)

    //加载文件
    useEffect(() => {
        serverApi.fileset().then((e) => setChooies(e))
    }, [])

    useImperativeHandle(ref, () => ({
        getData: () => {
            return state
        }
    }))

    return <List bordered
        style={{ height: '90%', overflowY: 'auto' }}
        header={<Flex justify={"space-between"} align={'center'}>
            <Typography.Text strong>Native Files</Typography.Text>
            <Input.Search placeholder={"Search name"} style={{ width: 300 }} />
        </Flex>}
        dataSource={chooies}
        renderItem={(item) => {
            return <List.Item
                actions={[<Checkbox checked={item.path === state?.path} onChange={(e) => setSelected(e.target.value)} value={item} />]}
                extra={<Image width={50} src={[".png", ".jpg", ".jpeg"].includes(item.format) ? item.url : undefined}></Image>}
            >
                <List.Item.Meta title={item.name} description={item.path} />
            </List.Item>
        }}
    >
    </List>
})


interface BinaryPreviewProps {
    type?: string
    value?: Uint8Array
}

const BinaryPreview: React.FC<BinaryPreviewProps> = ({ type, value }) => {

    const [src, setSrc] = useState<string>()
    useEffect(() => {
        if (value) {
            const url = URL.createObjectURL(new Blob([value]))
            setSrc(url)
        }
    }, [value])

    if (src) {
        return <Flex align={'center'} justify={'center'} vertical>
            <Image src={src} style={{ height: 200 }} preview placeholder={"file"}></Image>
        </Flex>
    }
    return <Fragment />
}