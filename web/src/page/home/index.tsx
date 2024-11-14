import { CheckOutlined, CloseOutlined, CopyOutlined, DeleteOutlined, DockerOutlined, DownOutlined, EditOutlined, FolderOutlined, GithubOutlined, HomeOutlined, LogoutOutlined, MoreOutlined, PlusOutlined, ShareAltOutlined } from "@ant-design/icons";
import { Button, Checkbox, Dropdown, Empty, Flex, Form, Input, List, MenuProps, message, Modal, Popover, Splitter, Tabs, TabsProps, Tag, Tree, TreeDataNode, Typography } from "antd";
import React, { createContext, forwardRef, Fragment, useCallback, useContext, useEffect, useImperativeHandle, useRef, useState } from "react";
import { METHOD_COLORS } from "../../api/constant";
import { ApiCollect, ApiMockDefine, HttpBody, Workspace } from "../../api/base";
import HttpMockTab, { HttpMockTabTitle } from "../http";
import { useApiCacheStore, useApiCollectStore, useWorkspaceStore } from "../../store";
import { v4 } from "uuid";
import { DefaultHttpMockDefine, ServerApi } from "../../api";
import { useNavigate, useParams } from "react-router";



const WorkspacesList: React.FC = () => {

    const { workspaces, current } = useWorkspaceStore(state => state)

    const nav = useNavigate()
    const handleChange = (ws: Workspace) => {
        nav("/workspace/" + ws.id)
    }

    return <Flex vertical gap={5} style={{ width: 300 }}>
        <List header={<Typography.Text type={"secondary"}>Recently visited</Typography.Text>}>
            <List.Item onClick={() => { }}><Flex gap={5} align={'center'}><Typography>{current.name}</Typography></Flex></List.Item>
        </List>
        <List header={<Typography.Text type={"secondary"}>More workspaces</Typography.Text>}>
            {
                workspaces.map((e, idx) => {
                    return <List.Item key={idx} actions={[<Button type={"link"} onClick={() => { handleChange(e) }}>Change</Button>]}>
                        <List.Item.Meta title={e.name} description={e.endpoint}></List.Item.Meta>
                    </List.Item>
                })
            }
        </List>
    </Flex>
}



const ApiCollectTreePannel: React.FC<{ workspaceId: string }> = ({ workspaceId }) => {

    const [stateNodes, setNodes] = useState<TreeDataNode[]>([])

    const collectHold = useApiCollectStore(state => state)

    //初始化tree节点
    useEffect(() => {

        const nodes = ApiConvertNodes(workspaceId, collectHold.tree())
        setNodes(nodes)

    }, [workspaceId, collectHold.apis, collectHold.collects])


    const apiCtx = useContext(ApiContext)

    //打开
    const handleOpen = (_: React.Key[], { node }: any) => {
        if (node.parent) {
            return
        }
        collectHold.selectPath(node.key)
        apiCtx?.openTab(node.key)
    }


    const ApiConvertNodes = (wid: string, collect: ApiCollect<any>[]) => {
        return collect.map((arr) => {
            return {
                title: <CollectTreeNodeTitle workspaceId={wid} id={arr.id} name={arr.name} />,
                checkable: true,
                key: arr.id,
                parent: true,
                children: arr.paths.map((item) => {
                    return {
                        key: item.id,
                        title: <PathTreeNodeTitle workspaceId={wid} data={item} />
                    } as TreeDataNode
                })
            } as TreeDataNode
        })
    }


    //搜索
    const handleSearch = (search: string) => {
        if (search === "") {
            return setNodes(ApiConvertNodes(workspaceId, collectHold.tree()))
        }
        const results = collectHold.tree().map(e => {
            return { ...e, paths: e.paths.filter(p => p.name.indexOf(search) !== -1) }
        }).filter(e => e.paths.length > 0)

        setNodes(ApiConvertNodes(workspaceId, results))
    }


    const [newCollect, setNewCollect] = useState<boolean>(false)
    const [newCollectName, setNewCollectName] = useState<string>()
    const handleCancelNewCollect = () => {
        setNewCollect(false)
        setNewCollectName("")
    }

    //新增 
    const handleNewCollect = async () => {
        if (!newCollectName) {
            return
        }

        await serverApi.saveCollect(workspaceId, { id: "", name: newCollectName, paths: [] })
            .then(e => collectHold.append(e))
            .catch(e => message.error(e || e.message))
            .finally(handleCancelNewCollect)
    }


    return <Flex vertical gap={10} style={{ height: 800 }}>
        <Flex justify={"space-between"} gap={10}>
            <Input.Search placeholder={"Search Name"} onSearch={(e) => handleSearch(e)}></Input.Search><Button icon={<PlusOutlined />} onClick={() => setNewCollect(true)}>New Collect</Button>
        </Flex>

        {newCollect && <Flex justify={"space-between"} align={"center"} gap={10}>
            <Input value={newCollectName} onChange={(e) => setNewCollectName(e.target.value)} placeholder={"Name your collect"} />
            <Flex gap={5}><Button onClick={handleNewCollect}>Save</Button>, <Button onClick={handleCancelNewCollect}>Cancel</Button></Flex>
        </Flex>}


        {(stateNodes.length === 0 && !newCollect)
            ? <Empty />
            : <Tree showLine height={800}
                treeData={stateNodes} blockNode autoExpandParent defaultExpandAll selectable selectedKeys={collectHold.selected ? [collectHold.selected] : []} onSelect={handleOpen}></Tree>
        }
    </Flex>
}


const treeCollectDropdownItems: MenuProps['items'] = [
    {
        key: 'new',
        icon: <CopyOutlined />,
        label: 'New Http'
    },
    {
        key: 'rename',
        icon: <EditOutlined />,
        label: "Rename"
    },
    {
        key: 'delete',
        icon: <DeleteOutlined />,
        label: <Typography.Text type={"danger"}>Delete</Typography.Text>
    },
]


const CollectTreeNodeTitle: React.FC<{ workspaceId: string, id: string, name: string }> = ({ workspaceId, id, name }) => {

    const [state, setName] = useState<string>(name)
    const [edit, setEdit] = useState<boolean>(false)

    const collectHold = useApiCollectStore(state => state)

    const apiCtx = useContext(ApiContext)


    const handleEvent = (key: string) => {

        if (key === "rename") {
            //重命名
            return setEdit(true)
        } else if (key === "new") {
            //新增

            const newTabDefine: ApiMockDefine<HttpBody> = {
                ...DefaultHttpMockDefine,
                collectId: id,
                id: v4(),
            }
            apiCtx?.newTab(newTabDefine)
            return collectHold.storePath(newTabDefine)
        } else if (key === "delete") {
            //删除
            return collectHold.remove(id)
        }
    }


    //更新名称
    const handleEditName = async () => {
        await serverApi.updateCollect(workspaceId, { id: id, name: state, paths: [] }).then((e) => {
            collectHold.update(e)
        }).finally(() => setEdit(false))
    }


    return <Flex justify={"space-between"} align={'center'} style={{ margin: 5 }}>
        <Flex gap={10}>
            <FolderOutlined />
            {edit
                ? <Input value={state} onChange={(e) => setName(e.target.value)} suffix={<Flex justify={"space-between"} gap={10}><CheckOutlined onClick={handleEditName} /><CloseOutlined onClick={() => setEdit(false)} /></Flex>} />
                : <Typography.Text>{state}</Typography.Text>
            }
        </Flex>
        <Dropdown menu={{ items: treeCollectDropdownItems, onClick: (e) => handleEvent(e.key) }}>
            <Button icon={<MoreOutlined />} type={"text"}></Button>
        </Dropdown>
    </Flex>
}




const treePathDropdownItems: MenuProps['items'] = [
    {
        key: 'copy',
        icon: <CopyOutlined />,
        label: <Typography.Text>Duplicate</Typography.Text>
    },
    {
        key: 'share',
        icon: <ShareAltOutlined />,
        label: <Typography.Text>Share</Typography.Text>
    },
    {
        key: 'delete',
        icon: <DeleteOutlined />,
        label: <Typography.Text type={"danger"}>Delete</Typography.Text>
    },
]



const PathTreeNodeTitle: React.FC<{ workspaceId: string, data: ApiMockDefine<any> }> = ({ workspaceId, data }) => {

    const collectHold = useApiCollectStore(state => state)
    const handleEvent = (key: string) => {
        if (key === "delete") {
            return handleRemove()
        } else if (key === "copy") {
            return handleCopy()
        } else if (key === "share") {
            return handleShare()
        }
    }


    //删除
    const handleRemove = async () => {
        await serverApi.removeApi(workspaceId, data.id).then(() => {
            collectHold.removePath(data.id)
        })
    }

    //拷贝
    const handleCopy = () => {
        //todo
    }

    //分享
    const handleShare = () => {

    }
    return <Flex justify={"space-between"} gap={5} align={'center'} style={{ margin: 5 }}>
        <Flex gap={2} align={'center'}>
            <Tag color={METHOD_COLORS[data.method]}>{data.method}</Tag>
            <Typography.Text>{data.name}</Typography.Text>
        </Flex>
        <Dropdown menu={{ items: treePathDropdownItems, onClick: (e) => handleEvent(e.key) }}>
            <Button icon={<MoreOutlined />} type={"text"}></Button>
        </Dropdown>
    </Flex>
}




interface ApiContextProps {
    newTab: (define: ApiMockDefine<HttpBody>) => void
    openTab: (id: string) => void
}

const ApiContext = createContext<ApiContextProps | undefined>(undefined)



const HomePage: React.FC<{ workspaceId: string }> = ({ workspaceId }) => {

    //兼容路由
    const { wid } = useParams()
    if (wid) {
        workspaceId = wid
    }

    const workspaceHold = useWorkspaceStore(state => state)
    const collectHold = useApiCollectStore(state => state)
    const cacheHold = useApiCacheStore(state => state)
    //默认
    useEffect(() => {

        const init = async (wid: string) => {

            //获取最新工作空间配置
            const all = await serverApi.getWorkspaces()
            const ws = all.find(e => e.id === wid)
            workspaceHold.initialization(all, ws!)


            //获取当前空间接口集合
            const collects = await serverApi.getCollects(wid)
            collectHold.initialization(collects, cacheHold.selected[wid] as string)
        }

        //加载数据
        init(workspaceId)
    }, [workspaceId])


    const tabRef = useRef<ApiCollectTabsPannelHandle>(null)
    const handleNewTab = useCallback((define: ApiMockDefine<HttpBody>) => {
        tabRef.current?.newTab(define)
    }, [])


    const handleOpenTab = useCallback((id: string) => {
        tabRef.current?.openTab(id)
    }, [])


    return <Flex vertical gap={5} style={{ height: "100%" }}>
        <ApiContext.Provider value={{ newTab: handleNewTab, openTab: handleOpenTab }}>
            <WorkspacesPannel />
            <Splitter style={{ boxShadow: '0 0 10px rgba(0, 0, 0, 0.1)' }}>
                <Splitter.Panel defaultSize={"20%"} min={"20%"} style={{ margin: 10 }}>
                    <ApiCollectTreePannel workspaceId={workspaceId} />
                </Splitter.Panel>
                <Splitter.Panel style={{ margin: 10 }}>
                    <ApiCollectTabsPannel workspaceId={workspaceId} hasOpendIds={cacheHold.opened[workspaceId] as string[]} selectedId={collectHold.selected} ref={tabRef} />
                </Splitter.Panel>
            </Splitter>
        </ApiContext.Provider>
    </Flex>
}



const WorkspacesPannel: React.FC = () => {
    return <Flex justify={'space-between'} gap={5}>
        <Flex justify={"center"} align={'center'}>
            <Button type={"text"} icon={<HomeOutlined />}>Home</Button>
            <Popover content={<Fragment />} title="Title">
                <Button type={"text"} iconPosition={"end"} icon={<DownOutlined />}>Api Network</Button>
            </Popover>
            <Popover content={<WorkspacesList />} title="My Workspaces">
                <Button type={"text"} iconPosition={"end"} icon={<DownOutlined />}>Workspaces</Button>
            </Popover>
        </Flex>
        <Input.Search placeholder="Search Mockman" style={{ width: 300 }} size={"middle"} />
        <Button icon={<GithubOutlined />} type={"link"} href="https://github.com/otk-final/mockman">Github</Button>
    </Flex>
}


const serverApi = new ServerApi()


interface ApiCollectTabsPannelData {
    workspaceId: string
    hasOpendIds: string[],
    selectedId?: string
}
interface ApiCollectTabsPannelHandle {
    newTab: (define: ApiMockDefine<HttpBody>) => void
    openTab: (id: string) => void
    closeTab: (id: string) => void
}

const ApiCollectTabsPannel = forwardRef<ApiCollectTabsPannelHandle, ApiCollectTabsPannelData>(({ workspaceId, hasOpendIds, selectedId }, ref) => {

    //默认打开第一个
    const [activeKey, setActiveKey] = useState<string>(selectedId ? selectedId : (hasOpendIds ? hasOpendIds[0] : ""))
    const [renderItems, setRenderItems] = useState<TabsProps["items"]>([])
    const collectHold = useApiCollectStore(state => state)

    //初始化面板
    useEffect(() => {

        const init = async (wid: string, hasOpendIds: string[]) => {
            //查询接口信息
            const initTask = hasOpendIds.map(async (e) => {
                return serverApi.getApiDefine(wid, e)
            }).filter(e => e !== undefined)

            const initdefines = await Promise.all(initTask)
            const initTabs = initdefines.map(e => initCreateTab(workspaceId, e))
            setRenderItems(initTabs)
        }

        if (hasOpendIds) {
            init(workspaceId, hasOpendIds)
        }

    }, [workspaceId, hasOpendIds])



    useImperativeHandle(ref, () => ({
        newTab: (define: ApiMockDefine<HttpBody>) => {
            return handleCreate(define)
        },
        openTab: (id: string) => {
            return handleOpen(id)
        },
        closeTab: (id: string) => {
            return
        }
    }))


    //初始化
    const initCreateTab = (workspaceId: string, define: ApiMockDefine<HttpBody>) => {
        return {
            id: define.id,
            key: define.id,
            label: <HttpMockTabTitle data={define} />,
            closable: true,
            // style: { height: "100%" },
            children: <HttpMockTab workspaceId={workspaceId} data={define} />
        } as any
    }


    //新增 or 关闭
    const handleEdit = (targetKey: any, action: 'add' | 'remove',) => {
        if (action === "remove") {
            const remainItems = renderItems?.filter(e => e.id !== targetKey)
            return setRenderItems(remainItems)
        }

        const defaultDefine: ApiMockDefine<HttpBody> = {
            ...DefaultHttpMockDefine,
            id: v4(),
        }
        return handleCreate(defaultDefine)
    }


    //创建 并 打开
    const handleCreate = (define: ApiMockDefine<HttpBody>) => {

        //append
        const newTab = initCreateTab(workspaceId, define)
        renderItems!.push(newTab)
        setRenderItems([...renderItems!])

        handleActiveKey(define.id)
    }


    //选择 并 打开
    const handleOpen = async (id: string) => {
        if (!renderItems?.some(e => e.id === id)) {

            //api
            const define = await serverApi.getApiDefine(workspaceId, id).catch(e => message.error(e || e.message))
            if (define === null) {
                return
            }
            const newTab = initCreateTab(workspaceId, define as ApiMockDefine<HttpBody>)

            //append
            renderItems!.push(newTab)
            setRenderItems([...renderItems!])
        }
        return handleActiveKey(id)
    }

    //选中
    const handleActiveKey = (id: string) => {
        collectHold.selectPath(id)
        return setActiveKey(id)
    }


    return <Tabs items={renderItems} type={"editable-card"} activeKey={activeKey} onChange={handleActiveKey} onEdit={handleEdit} style={{ height: "100%" }}></Tabs>
})


export default HomePage
