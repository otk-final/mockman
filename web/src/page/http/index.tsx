import React, { forwardRef, Fragment, useEffect, useImperativeHandle, useRef, useState } from "react"
import { ApiCollect, ApiMockDefine, ApiRequestDefine, ApiResponseDefine, HttpBody, HttpBodyDataType } from "../../api/base"
import { Button, Checkbox, Dropdown, Empty, Flex, Form, Input, List, message, Modal, Spin, Splitter, Tabs, Tag, Typography } from "antd"
import { BugOutlined, DownOutlined, PlusOutlined, SaveOutlined } from "@ant-design/icons"
import { MethodAddon } from "../../component/http/method"
import { TabsProps } from "antd/lib"
import { KVHint, KVTable, KVTableHandle } from "../../component/kv/header"
import { BodyEditor, BodyEditorHandle } from "../../component/http/body"
import { METHOD_COLORS } from "../../api/constant"
import { useApiCollectStore, useApiTestingStore, useWorkspaceStore } from "../../store"
import { MockApi, ServerApi } from "../../api"


export const HttpMockTabTitle: React.FC<{ data: ApiMockDefine<any> }> = ({ data }) => {

    const [state, setData] = useState<ApiMockDefine<any>>(data)
    const { apis } = useApiCollectStore(state => state)

    //监听数据变更  
    useEffect(() => {
        const path = apis.filter(e => e.id === data.id)[0]
        if (!path) {
            return
        }
        setData(path)
    }, [data, apis])

    return <Flex gap={10} align={'center'}>
        <Typography.Text style={{ color: METHOD_COLORS[state.method] }}>{state.method}</Typography.Text>
        <Typography.Text>{state.name}</Typography.Text>
    </Flex>
}

const serverApi = new ServerApi()

const HttpMockTab: React.FC<{ workspaceId: string, data: ApiMockDefine<HttpBody> }> = ({ workspaceId, data }) => {

    const [loading, setLoading] = useState<boolean>(false)
    const [state, setData] = useState<ApiMockDefine<HttpBody>>({ ...data })

    //历史记录
    const testingHold = useApiTestingStore(state => state)
    const [request,] = useState<ApiRequestDefine<HttpBody>>(testingHold.getRequest(data.id))
    const [response,] = useState<ApiResponseDefine<HttpBody> | undefined>(testingHold.getResponse(data.id))


    const mockRef = useRef<MockTabsHandle>(null)
    const requestRef = useRef<RequestTabsHandle>(null)
    const responseRef = useRef<ResponseTabsHandle>(null)
    const saveRef = useRef<SaveAsModalHandle>(null)

    const handleSave = async () => {
        const currentConfig = getMockConfig()

        if (currentConfig.collectId !== "") {
            //TODO save
            return await serverApi.saveApi(workspaceId, currentConfig).then(() => message.success("Save success")).catch(e => message.error(e || e.message))
        }
        return saveRef.current!.save(currentConfig)
    }
    const handleSaveAs = async () => {
        return saveRef.current!.save(getMockConfig())
    }

    const collectsHold = useApiCollectStore(state => state)


    const handleSaveAsCompleted = (saved: ApiMockDefine<HttpBody>) => {

        const newState = { ...state, persisted: true, name: saved.name, collectId: saved.collectId }
        setData(newState)

        collectsHold.storePath(newState)
    }

    const getMockConfig = () => {
        const mockConfig = mockRef.current!.getData!()
        return {
            ...mockConfig,
            method: state.method,
            path: state.path,
            name: state.name,
            id: state.id,
            collectId: state.collectId
        }
    }

    const handleChangeMethod = (method: string) => {
        const newState = { ...state, method: method }
        setData(newState)
        collectsHold.storePath(newState)
    }

    const handleChangePath = (path: string) => {
        setData({ ...state, path: path })
    }

    const workspaceHold = useWorkspaceStore(state => state)
    const handleTesting = async () => {
        setLoading(true)

        //模拟请求
        const mockApi = new MockApi(workspaceHold.current)
        const reqData = requestRef.current!.getData!()
        reqData.method = state.method
        reqData.path = state.path

        //渲染响应
        responseRef.current!.setData!(undefined)
        mockApi.call(reqData).then((resp) => responseRef.current!.setData!(resp)).finally(() => setLoading(false))
    }

    return <Flex vertical gap={5} style={{ height: "100%" }} justify={"space-between"}>
        <Flex align={"center"} gap={5}>
            <EndpintInput method={state.method} path={state.path} onChangeMethod={handleChangeMethod} onChangePath={handleChangePath} />
            <Flex gap={10} align={'center'}>
                <Dropdown.Button
                    onClick={handleSave}
                    menu={{
                        items: [{
                            key: 'saveAs',
                            icon: <SaveOutlined />,
                            label: "Save as",
                            onClick: handleSaveAs
                        }]
                    }} icon={<DownOutlined />}
                    key={"save"}
                    size={"large"}>
                    Save
                </Dropdown.Button>
                <Button size={"large"} icon={<BugOutlined />} style={{ color: "green" }} loading={loading} onClick={handleTesting}>Testing</Button>
            </Flex>
        </Flex>

        <Splitter >
            <Splitter.Panel style={{ padding: 5 }}>
                <MockTabs data={state} ref={mockRef} />
            </Splitter.Panel>
            <Splitter.Panel>
                <Splitter layout="vertical">
                    <Splitter.Panel style={{ padding: 5 }}>
                        <RequestTabs data={request} ref={requestRef} />
                    </Splitter.Panel>
                    <Splitter.Panel style={{ padding: 5 }}>
                        <ResponseTabs data={response} ref={responseRef} />
                    </Splitter.Panel>
                </Splitter>
            </Splitter.Panel>
        </Splitter>
        <SaveAsModal workspaceId={workspaceId} onCompleted={handleSaveAsCompleted} ref={saveRef} />
    </Flex>
}


interface SaveAsModalHandle {
    save: (data: ApiMockDefine<HttpBody>) => void
}

interface SaveAsModalProps {
    workspaceId: string
    onCompleted: (data: ApiMockDefine<HttpBody>) => void
}

const SaveAsModal = forwardRef<SaveAsModalHandle, SaveAsModalProps>(({ workspaceId, onCompleted }, ref) => {

    const [open, setOpen] = useState<boolean>(false)
    const [state, setData] = useState<ApiMockDefine<HttpBody>>()

    useImperativeHandle(ref, () => ({
        save: (data: ApiMockDefine<HttpBody>) => {
            setData(data)
            setOpen(true)
        }
    }))

    const collectsHold = useApiCollectStore(state => state)


    const [newCollect, setNewCollect] = useState<boolean>(false)
    const [newCollectName, setNewCollectName] = useState<string>()
    //新增目录
    const handleNewCollect = async () => {
        if (!newCollectName) {
            return
        }

        await serverApi.saveCollect(workspaceId, { id: "", name: newCollectName, paths: [] })
            .then(e => collectsHold.append(e))
            .catch(e => message.error(e || e.message))
            .finally(() => setNewCollect(false))
    }

    const handleCancelNewCollect = () => {
        setNewCollect(false)
        setNewCollectName("")
    }

    const handleChooseCollect = (targetCollect: ApiCollect<any>) => {
        setData({ ...state!, collectId: targetCollect.id })
    }

    //保存
    const handleCompleted = async () => {
        const ok = await serverApi.saveApi(workspaceId, state!).catch(e => message.error(e || e.message))
        if (ok === undefined) {
            return
        }
        setOpen(false)
        onCompleted(state!)
    }

    return <Modal title={"Save Mock"}
        width={800}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={handleCompleted}
    >
        <Flex vertical gap={10}>
            <Form.Item label={"Request Name"} layout={"vertical"}>
                <Input size={"middle"} placeholder={"Required"} value={state?.name} onChange={(e) => setData({ ...state!, name: e.target.value })} />
            </Form.Item>
            <Form.Item label={"Save to"} layout={"vertical"}>
                <List bordered
                    style={{ height: 400 }}
                    header={
                        <Flex justify={"space-between"} align={'center'} >
                            <Typography.Text>Select a collection/folder</Typography.Text>
                            <Button icon={<PlusOutlined />} onClick={() => setNewCollect(true)}>New Collect</Button>
                        </Flex>}
                >
                    {
                        collectsHold.collects.map((e, idx) => {
                            return <List.Item id={e.id} key={idx} actions={[<Checkbox checked={e.id === state?.collectId} onClick={() => handleChooseCollect(e)} />]} >
                                <List.Item.Meta title={e.name}></List.Item.Meta>
                            </List.Item>
                        })
                    }
                    {newCollect && <List.Item actions={[<Button onClick={handleNewCollect}>Save</Button>, <Button onClick={handleCancelNewCollect}>Cancel</Button>]} >
                        <Input value={newCollectName} onChange={(e) => setNewCollectName(e.target.value)} placeholder={"Name your collect"} />
                    </List.Item>}
                </List>
            </Form.Item>
        </Flex>
    </Modal>
})

const EndpintInput: React.FC<{ method: string, path: string, onChangeMethod: (method: string) => void, onChangePath: (path: string) => void }> = ({ method, path, onChangeMethod, onChangePath }) => {

    const [stateMethod, setMethod] = useState<string>(method)
    const [statePath, setPath] = useState<string>(path)

    const handleChangePath = (e: string) => {
        setPath(e)
        onChangePath(e)
    }

    const handleChangeMethod = (e: string) => {
        setMethod(e)
        onChangeMethod(e)
    }

    const worspaceHold = useWorkspaceStore(state => state)
    return <Input
        addonBefore={<MethodAddon value={stateMethod} onChange={handleChangeMethod} />}
        size={"large"}
        value={statePath}
        onChange={(e) => { handleChangePath(e.target.value) }}
        prefix={<Button type={'default'}>{worspaceHold.current.endpoint}</Button>}
    ></Input>
}


const headerHints: KVHint[] = [
    {
        name: "Content-Type",
        options: ["application/json", "application/xml", "application/octet-stream", "application/x-www-form-urlencoded", "multipart/form-data", "text/plain","text/html"]
    },
    {
        name: "Connection",
        options: ["keep-alive"]
    },
    {
        name: "Accept",
        options: ["*/*"]
    },
    {
        name: "User-Agent",
        options: ["MockmanRuntime/1.0.0"]
    },

]

const statusHints: KVHint[] = [
    {
        name: "statusCode",
        options: ["200", "404", "500"]
    },
    {
        name: "statusText",
        options: ["OK", "Success"]
    }
]


interface MockTabsProps {
    data: ApiMockDefine<HttpBody>
}

interface MockTabsHandle {
    getData?: () => ApiMockDefine<HttpBody>
    setData?: (data: ApiMockDefine<HttpBody>) => void
}

const MockTabs = forwardRef<MockTabsHandle, MockTabsProps>(({ data }, ref) => {

    const [state,] = useState<ApiMockDefine<HttpBody>>({ ...data })


    const route_params_ref = useRef<KVTableHandle>(null)
    const route_headers_ref = useRef<KVTableHandle>(null)
    const mock_headers_ref = useRef<KVTableHandle>(null)
    const mock_status_ref = useRef<KVTableHandle>(null)
    const mock_body_ref = useRef<BodyEditorHandle>(null)


    //暴露数据
    useImperativeHandle(ref, () => ({
        getData: () => {
            const result = { ...state }
            //防止页面未渲染
            if (route_params_ref.current) {
                result.route_params = route_params_ref.current.getData()
            }
            if (route_headers_ref.current) {
                result.route_headers = route_headers_ref.current.getData()
            }
            if (mock_status_ref.current) {
                result.mock_status = mock_status_ref.current.getData()
            }
            if (mock_body_ref.current) {
                result.mock_body = mock_body_ref.current.getData()
            }
            if (mock_headers_ref.current) {
                result.mock_headers = mock_headers_ref.current.getData()
            }
            return result
        }
    }))

    const settingTabItems: TabsProps['items'] = [
        {
            key: "route_params",
            label: "Route Params",
            children: <KVTable data={state.route_params} hints={headerHints} ref={route_params_ref} />
        },
        {
            key: "route_headers",
            label: "Route Headers",
            children: <KVTable data={state.route_headers} hints={headerHints} ref={route_headers_ref} />
        },
        {
            key: "status",
            label: "Mock Status",
            children: <KVTable data={state.mock_status} hints={statusHints} fixed={true} ref={mock_status_ref} />
        },
        {
            key: "body",
            label: "Mock Body",
            children: <BodyEditor schemes={["none", "file", "raw"]} data={state.mock_body} ref={mock_body_ref} />
        },
        {
            key: "headers",
            label: "Mock Headers",
            children: <KVTable data={state.mock_headers} hints={headerHints} ref={mock_headers_ref} />
        }]

    return <Tabs items={settingTabItems} defaultActiveKey={"body"} style={{ height: '100%' }} />
})



interface RequestTabsProps {
    data: ApiRequestDefine<HttpBody>
}

interface RequestTabsHandle {
    getData?: () => ApiRequestDefine<HttpBody>
    setData?: (data: ApiRequestDefine<HttpBody>) => void
}

const RequestTabs = forwardRef<RequestTabsHandle, RequestTabsProps>(({ data }, ref) => {
    const [state,] = useState<ApiRequestDefine<HttpBody>>({ ...data })

    const bodyRef = useRef<BodyEditorHandle>(null)
    const parmatersRef = useRef<KVTableHandle>(null)
    const headersRef = useRef<KVTableHandle>(null)

    //暴露数据
    useImperativeHandle(ref, () => ({
        getData: () => {
            const result = { ...state }
            //防止页面未渲染
            if (headersRef.current) {
                result.headers = headersRef.current.getData()
            }
            if (parmatersRef.current) {
                result.parmaters = parmatersRef.current.getData()
            }
            if (bodyRef.current) {
                result.body = bodyRef.current.getData()
            }
            return result
        }
    }))

    const settingTabItems: TabsProps['items'] = [
        {
            key: "parmaters",
            label: "Parmaters",
            children: <KVTable data={state.parmaters} hints={statusHints} ref={parmatersRef} />
        },
        {
            key: "headers",
            label: "Headers",
            children: <KVTable data={state.headers} hints={headerHints} ref={headersRef} />
        },
        {
            key: "body",
            label: "Body",
            children: <BodyEditor schemes={["none", "form", "raw"]} data={state.body} ref={bodyRef} />
        }]
    return <Tabs items={settingTabItems} defaultActiveKey={"body"} style={{ height: '100%' }} />
})


interface ResponseTabsProps {
    data?: ApiResponseDefine<HttpBody>
}

interface ResponseTabsHandle {
    getData?: () => ApiResponseDefine<HttpBody>
    setData?: (data?: ApiResponseDefine<HttpBody>) => void
}

const ResponseTabs = forwardRef<ResponseTabsHandle, ResponseTabsProps>(({ data }, ref) => {

    const [resp, setResp] = useState<ApiResponseDefine<HttpBody> | undefined>(data)


    const bodyRef = useRef<BodyEditorHandle>(null)
    const headersRef = useRef<KVTableHandle>(null)

    //更新数据
    useImperativeHandle(ref, () => ({
        setData: (data?: ApiResponseDefine<HttpBody>) => setResp(data)
    }))

    if (!resp) {
        return <Flex align={'center'} justify={'center'} style={{ height: "100%" }}><Empty description={"Save the URL and click Testing to get a mock response"} /></Flex>
    }

    const renderTabItems: TabsProps['items'] = [
        {
            key: "headers",
            label: "Headers",
            children: <KVTable data={resp?.headers || []} hints={headerHints} fixed={true} ref={headersRef} />
        },
        {
            key: "body",
            label: "Body",
            children: <BodyEditor schemes={["none", "binary", "raw"]} data={resp.body} ref={bodyRef} />
        }]

    const statusRender = () => {
        if (resp) {
            return <Flex gap={10}>
                < Typography.Text > statusCode：</ Typography.Text>
                <Tag color={resp.status === 200 ? 'green' : "red"}>{resp.status}</Tag> <Typography.Text>{resp.statusText}</Typography.Text>
            </Flex>
        }
        return <Fragment />
    }

    return <Tabs items={renderTabItems} defaultActiveKey={"body"} tabBarExtraContent={statusRender()} style={{ height: '100%' }}></Tabs >
})



export default HttpMockTab