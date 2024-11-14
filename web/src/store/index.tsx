import { create } from "zustand";
import { ApiCollect, ApiMockDefine, ApiRequestDefine, ApiResponseDefine, DefaultHttpBody, HttpBody, Workspace } from "../api/base";


export interface useApiCachedProps {
    //已打开
    opened: Partial<Record<string, string[]>>
    //当前
    selected: Partial<Record<string, string>>
}

export interface useApiCachedHandle {

    setOpened: (wid: string, id: string) => void

    removeOpend: (wid: string, id: string) => void


}


export const useApiCacheStore = create<useApiCachedProps & useApiCachedHandle>((set, get) => ({
    opened: {},
    selected: {},
    setOpened: (wid: string, id: string) => {
        const { opened, selected } = get()

        //添加已打开
        const hasOpened = opened[wid] || []
        if (!hasOpened?.includes(id)) {
            hasOpened?.push(id)
        }
        opened[wid] = hasOpened


        selected[wid] = id
        set({ opened: { ...opened }, selected: { ...selected } })
    },

    removeOpend: (wid: string, id: string) => {
        const { opened } = get()
        const hasOpened = opened[wid] || []
        const remainOpened = hasOpened.filter(e => e !== id)

        opened[wid] = remainOpened
        set({ opened: { ...opened } })
    }
}))

export interface useApiTestingProps {
    //已打开
    request: Partial<Record<string, ApiRequestDefine<HttpBody>>>
    //当前
    response: Partial<Record<string, ApiResponseDefine<HttpBody>>>
}

export interface useApiTestingHandle {
    saveRequest: (id: string, data: ApiRequestDefine<HttpBody>) => void
    getRequest: (id: string) => ApiRequestDefine<HttpBody>
    saveResponse: (id: string, data: ApiResponseDefine<HttpBody>) => void
    getResponse: (id: string) => ApiResponseDefine<HttpBody> | undefined
}

const defaultRequest: ApiRequestDefine<HttpBody> = {
    id: "",
    name: "",
    method: "",
    path: "",
    headers: [],
    parmaters: [],
    body: { ...DefaultHttpBody }
}



export const useApiTestingStore = create<useApiTestingProps & useApiTestingHandle>((set, get) => ({

    request: {},

    response: {},

    saveRequest: (id: string, data: ApiRequestDefine<HttpBody>) => {
        const { request } = get()
        request[id] = data
        set({ request: request })
    },
    getRequest: (id: string) => {
        const { request } = get()
        return request[id] || defaultRequest
    },
    saveResponse: (id: string, data: ApiResponseDefine<HttpBody>) => {
        const { response } = get()
        response[id] = data
        set({ response: response })
    },
    getResponse: (id: string) => {
        const { response } = get()
        return response[id]
    },
}))


interface useWorkspaceProps {
    workspaces: Workspace[]
    current: Workspace
}

interface useWorkspaceHandle {
    initialization: (data: Workspace[], current: Workspace) => void
}

export const useWorkspaceStore = create<useWorkspaceProps & useWorkspaceHandle>((set,) => ({
    workspaces: [],
    current: { id: "default", name: "Default Workspace", endpoint: "http://127.0.0.1:18080" },
    initialization: (data: Workspace[], current: Workspace) => {
        set({ workspaces: data, current: current })
    },
}))




export interface ApiCollectProps {

    collects: ApiCollect<any>[]

    apis: ApiMockDefine<any>[]

    selected?: string
}


export interface ApiCollectHandle {

    initialization: (init: ApiCollect<any>[], selected: string) => void

    tree: () => ApiCollect<any>[]

    update: (item: ApiCollect<any>) => void

    append: (item: ApiCollect<any>) => void

    remove: (id: string) => void

    storePath: (path: ApiMockDefine<HttpBody>) => void

    removePath: (id: string) => void

    selectPath: (id: string) => void
}


export const useApiCollectStore = create<ApiCollectProps & ApiCollectHandle>((set, get) => ({
    collects: [],
    apis: [],
    // selected: ,
    initialization: (init: ApiCollect<any>[], selected: string) => {
        const apis = init.flatMap(e => e.paths)
        set({ collects: init, apis: apis, selected: selected })
    },
    tree: () => {
        const { collects, apis } = get()
        return collects.map(e => {
            return { ...e, paths: apis.filter(p => p.collectId === e.id) }
        })
    },
    selectPath: (id: string) => {
        set({ selected: id })
    },
    update: (item: ApiCollect<any>) => {
        const { collects } = get()
        const newCollects = collects.map(e => {
            return e.id === item.id ? item : e
        })
        set({ collects: newCollects })
    },
    append: (item: ApiCollect<any>) => {
        const { collects } = get()
        collects.push(item)
        set({ collects: [...collects] })
    },

    remove: (id: string) => {
        const { collects } = get()
        const remained = collects.filter(e => e.id !== id)
        set({ collects: remained })
    },
    removePath: (id: string) => {
        const { apis } = get()
        set({ apis: apis.filter(e => e.id !== id) })
    },
    storePath: (path: ApiMockDefine<HttpBody>) => {
        const { apis } = get()

        if (apis.some(e => e.id === path.id)) {
            const newApis = apis.map((e) => {
                return e.id == path.id ? path : e
            })
            return set({ apis: newApis })
        }

        apis.push(path)
        return set({ apis: [...apis] })
    },
}))