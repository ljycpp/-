import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { useTabVisibility } from '@/contexts/useTabVisibility'
// import { MiniMap } from '@react-sigma/minimap'
import { SigmaContainer, useRegisterEvents, useSigma } from '@react-sigma/core'
import { Settings as SigmaSettings } from 'sigma/settings'
import { GraphSearchOption, OptionItem } from '@react-sigma/graph-search'
import { EdgeArrowProgram, NodePointProgram, NodeCircleProgram } from 'sigma/rendering'
import { NodeBorderProgram } from '@sigma/node-border'
import EdgeCurveProgram, { EdgeCurvedArrowProgram } from '@sigma/edge-curve'

import FocusOnNode from '@/components/graph/FocusOnNode'
import LayoutsControl from '@/components/graph/LayoutsControl'
import GraphControl from '@/components/graph/GraphControl'
// import ThemeToggle from '@/components/ThemeToggle'
import ZoomControl from '@/components/graph/ZoomControl'
import FullScreenControl from '@/components/graph/FullScreenControl'
import Settings from '@/components/graph/Settings'
import GraphSearch from '@/components/graph/GraphSearch'
import GraphLabels from '@/components/graph/GraphLabels'
import PropertiesView from '@/components/graph/PropertiesView'
import SettingsDisplay from '@/components/graph/SettingsDisplay'

import { useSettingsStore } from '@/stores/settings'
import { useGraphStore } from '@/stores/graph'
import { Sprout, Leaf } from 'lucide-react'

import '@react-sigma/core/lib/style.css'
import '@react-sigma/graph-search/lib/style.css'

// Sigma settings
const defaultSigmaSettings: Partial<SigmaSettings> = {
  allowInvalidContainer: true,
  defaultNodeType: 'default',
  defaultEdgeType: 'curvedArrow',
  renderEdgeLabels: false,
  edgeProgramClasses: {
    arrow: EdgeArrowProgram,
    curvedArrow: EdgeCurvedArrowProgram,
    curvedNoArrow: EdgeCurveProgram
  },
  nodeProgramClasses: {
    default: NodeBorderProgram,
    circel: NodeCircleProgram,
    point: NodePointProgram
  },
  labelGridCellSize: 60,
  labelRenderedSizeThreshold: 12,
  enableEdgeEvents: true,
  labelColor: {
    color: '#000',
    attribute: 'labelColor'
  },
  edgeLabelColor: {
    color: '#000',
    attribute: 'labelColor'
  },
  edgeLabelSize: 8,
  labelSize: 12
  // minEdgeThickness: 2
  // labelFont: 'Lato, sans-serif'
}

const GraphEvents = () => {
  const registerEvents = useRegisterEvents()
  const sigma = useSigma()
  const [draggedNode, setDraggedNode] = useState<string | null>(null)

  useEffect(() => {
    // Register the events
    registerEvents({
      downNode: (e) => {
        setDraggedNode(e.node)
        sigma.getGraph().setNodeAttribute(e.node, 'highlighted', true)
      },
      // On mouse move, if the drag mode is enabled, we change the position of the draggedNode
      mousemovebody: (e) => {
        if (!draggedNode) return
        // Get new position of node
        const pos = sigma.viewportToGraph(e)
        sigma.getGraph().setNodeAttribute(draggedNode, 'x', pos.x)
        sigma.getGraph().setNodeAttribute(draggedNode, 'y', pos.y)

        // Prevent sigma to move camera:
        e.preventSigmaDefault()
        e.original.preventDefault()
        e.original.stopPropagation()
      },
      // On mouse up, we reset the autoscale and the dragging mode
      mouseup: () => {
        if (draggedNode) {
          setDraggedNode(null)
          sigma.getGraph().removeNodeAttribute(draggedNode, 'highlighted')
        }
      },
      // Disable the autoscale at the first down interaction
      mousedown: (e) => {
        // Only set custom BBox if it's a drag operation (mouse button is pressed)
        const mouseEvent = e.original as MouseEvent;
        if (mouseEvent.buttons !== 0 && !sigma.getCustomBBox()) {
          sigma.setCustomBBox(sigma.getBBox())
        }
      }
    })
  }, [registerEvents, sigma, draggedNode])

  return null
}

const GraphViewer = () => {
  const [sigmaSettings, setSigmaSettings] = useState(defaultSigmaSettings)
  const sigmaRef = useRef<any>(null)
  const initAttemptedRef = useRef(false)

  const selectedNode = useGraphStore.use.selectedNode()
  const focusedNode = useGraphStore.use.focusedNode()
  const moveToSelectedNode = useGraphStore.use.moveToSelectedNode()
  const isFetching = useGraphStore.use.isFetching()
  const shouldRender = useGraphStore.use.shouldRender() // Rendering control state

  // Get tab visibility
  const { isTabVisible } = useTabVisibility()
  const isGraphTabVisible = isTabVisible('knowledge-graph')

  const showPropertyPanel = useSettingsStore.use.showPropertyPanel()
  const showNodeSearchBar = useSettingsStore.use.showNodeSearchBar()
  const enableNodeDrag = useSettingsStore.use.enableNodeDrag()

  // Handle component mount/unmount and tab visibility
  useEffect(() => {
    // When component mounts or tab becomes visible
    if (isGraphTabVisible && !shouldRender && !isFetching && !initAttemptedRef.current) {
      // If tab is visible but graph is not rendering, try to enable rendering
      useGraphStore.getState().setShouldRender(true)
      initAttemptedRef.current = true
      console.log('Graph viewer initialized')
    }

    // Cleanup function when component unmounts
    return () => {
      // Only log cleanup, don't actually clean up the WebGL context
      // This allows the WebGL context to persist across tab switches
      console.log('Graph viewer cleanup')
    }
  }, [isGraphTabVisible, shouldRender, isFetching])

  // Initialize sigma settings once on component mount
  // All dynamic settings will be updated in GraphControl using useSetSettings
  useEffect(() => {
    setSigmaSettings(defaultSigmaSettings)
  }, [])

  // Clean up sigma instance when component unmounts
  useEffect(() => {
    return () => {
      // Clear the sigma instance when component unmounts
      useGraphStore.getState().setSigmaInstance(null);
      console.log('Cleared sigma instance on unmount');
    };
  }, []);

  // Note: There was a useLayoutEffect hook here to set up the sigma instance and graph data,
  // but testing showed it wasn't executing or having any effect, while the backup mechanism
  // in GraphControl was sufficient. This code was removed to simplify implementation

  const onSearchFocus = useCallback((value: GraphSearchOption | null) => {
    if (value === null) useGraphStore.getState().setFocusedNode(null)
    else if (value.type === 'nodes') useGraphStore.getState().setFocusedNode(value.id)
  }, [])

  const onSearchSelect = useCallback((value: GraphSearchOption | null) => {
    if (value === null) {
      useGraphStore.getState().setSelectedNode(null)
    } else if (value.type === 'nodes') {
      useGraphStore.getState().setSelectedNode(value.id, true)
    }
  }, [])

  const autoFocusedNode = useMemo(() => focusedNode ?? selectedNode, [focusedNode, selectedNode])
  const searchInitSelectedNode = useMemo(
    (): OptionItem | null => (selectedNode ? { type: 'nodes', id: selectedNode } : null),
    [selectedNode]
  )

  // Always render SigmaContainer but control its visibility with CSS
  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* 添加农业知识图谱标题 */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-emerald-50/80 dark:bg-emerald-900/50 p-2 flex items-center justify-center gap-2 backdrop-blur-sm">
        <Sprout className="size-5 text-emerald-600 dark:text-emerald-400" />
        <h2 className="text-lg font-bold text-emerald-800 dark:text-emerald-300">农业知识关系图谱</h2>
        <Leaf className="size-5 text-emerald-600 dark:text-emerald-400" />
      </div>
      
      <SigmaContainer
        settings={sigmaSettings}
        className="!bg-emerald-50/20 dark:!bg-emerald-950/20 !size-full overflow-hidden pt-10"
        ref={sigmaRef}
      >
        <GraphControl />

        {enableNodeDrag && <GraphEvents />}

        <FocusOnNode node={autoFocusedNode} move={moveToSelectedNode} />

        <div className="absolute top-12 left-2 flex items-start gap-2">
          <GraphLabels />
          {showNodeSearchBar && (
            <GraphSearch
              value={searchInitSelectedNode}
              onFocus={onSearchFocus}
              onChange={onSearchSelect}
            />
          )}
        </div>

        <div className="bg-emerald-50/80 dark:bg-emerald-900/50 absolute bottom-2 left-2 flex flex-col rounded-xl border-2 border-emerald-200 dark:border-emerald-800 backdrop-blur-lg">
          <LayoutsControl />
          <ZoomControl />
          <FullScreenControl />
          <Settings />
          {/* <ThemeToggle /> */}
        </div>

        {showPropertyPanel && (
          <div className="absolute top-12 right-2">
            <PropertiesView />
          </div>
        )}

        {/* <div className="absolute bottom-2 right-2 flex flex-col rounded-xl border-2">
          <MiniMap width="100px" height="100px" />
        </div> */}

        <SettingsDisplay />
      </SigmaContainer>

      {/* Loading overlay - shown when data is loading */}
      {isFetching && (
        <div className="absolute inset-0 flex items-center justify-center bg-emerald-50/80 dark:bg-emerald-900/80 z-10">
          <div className="text-center">
            <div className="mb-2 h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent"></div>
            <p className="text-emerald-800 dark:text-emerald-300">加载农业知识图谱数据...</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default GraphViewer
