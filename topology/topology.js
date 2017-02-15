/*!
 * topology diagram v1.1.0 -  jQuery raphael plug
 *
 * Includes jquery.js
 * Includes raphael.js
 *
 * Copyright © 2017-2017 huangqing
 * Released under the MIT license
 *
 * Date: 2017-01-20
 */

(function ($, Raphael) {
    'use strict';

    function TopologyDiagram(elem, Raphael, data) {
        this.config = {
            rect: {
                width: 'auto',
                height: 22,
                stroke: {
                    default: '#C1C5CA',
                    selected: '#B2C9E0'
                },
                'stroke-width': 1,
                fill: {
                    default: '#F4F4F4',
                    selected: '#EBF4FD'
                },
                radius: 3
            },
            image: {
                width: 16,
                height: 16
            },
            text: {
                'text-anchorstring': 'start',
                'font-family': '微软雅黑',
                'font-size': 12,
                'maxLength': 8
            },
            path: {
                'arrow-end': 'opan-wide-long',
                stroke: '#274355',
                'stroke-width': 1
            },
            node: {
                'padding-left': 4,
                'padding-top': 3,
                'margin-left': 40,
                'margin-top': 22
            },
            relateTypeEnum: {
                parent: 'parent',
                child: 'child'
            }
        };
        this.container = elem;
        this.paper = {
            element: Raphael(this.container, 1000, 1000),
            height: 0,
            width: 0
        };
        this.viewBox = {
            width: 0,
            height: 0

        };
        this.data = data;
        // 通过创建node自动生成的id绑定节点相关信息
        this.nodesHash = {};
        this.nodes = [];
        this.nodeMergeKey = 'id';
        this.nodeMergeHash = {};

        // 虚拟的根节点
        this.virtualRootNode = {
            virtualRoot: true,
            id: 'virtualRoot',
            x: 100,
            y: 100,
            width: 0,
            height: 0,
            originalData: null,
            nodeElements: null,
            parentNodes: [],
            childrenNodes: [],
            prevNode: null,
            nextNode: null,
            line: {
                start: false,
                end: false
            }
        };
    };

    TopologyDiagram.prototype.createRect = function (x, y, width, id) {
        var config = this.config.rect,
            paper = this.paper.element,
            rect;

        rect = paper.rect(x, y, width, config.height, this.config.radius).attr({
            fill: config.fill.default,
            'stroke-width': config['stroke-width'],
            stroke: config.stroke,
            r: config.radius
        });

        $(rect[0]).attr({
            'data-nodeId': id,
            'id': id + '-rect'
        });

        return rect;
    };

    TopologyDiagram.prototype.createImage = function (x, y, src, id) {
        var config = this.config.image,
            paper = this.paper.element,
            image;

        image = paper.image(src, x, y, config.width, config.height).attr({

        });

        $(image[0]).attr({
            'data-nodeId': id,
            'id': id + '-image'
        });

        return image;
    };

    TopologyDiagram.prototype.createText = function (x, y, text, id) {
        var config = this.config.text,
            maxLength = config.maxLength,
            paper = this.paper.element,
            title = text,
            textElem;

        if (text.length > maxLength) {
            text = text.slice(0, maxLength) + '...';
        }
        // 文字是以开始位置文字的水平中轴线为基线
        y = y + (config['font-size'] / 2) + 1;
        textElem = paper.text(x, y, text).attr({
            'font-size': config['font-size'],
            'text-anchor': 'start',
            'title': title,
            id: id + '-text'
        });

        $(textElem[0]).attr({
            'data-nodeId': id,
            'id': id + '-text'
        });

        return textElem;
    };

    TopologyDiagram.prototype.createNode = function (x, y, src, text, id) {
        var config = this.config,
            paddingLeft = config.node['padding-left'],
            paddingTop = config.node['padding-top'],
            rectElem,
            rectWidth,
            imageElem,
            textElem,
            startX = x,
            nextX,
            endX,
            startY = y,
            nextY,
            bBox;

        nextX = startX + paddingLeft;
        nextY = startY + paddingTop;
        imageElem = this.createImage(nextX, nextY, src, id);

        bBox = imageElem.getBBox();
        nextX = nextX + bBox.width + paddingLeft;
        textElem = this.createText(nextX, nextY, text, id);

        bBox = textElem.getBBox();
        endX = nextX + bBox.width + paddingLeft;

        rectWidth = Math.abs(endX - startX);
        rectElem = this.createRect(startX, startY, rectWidth, id);

        textElem.toFront();
        imageElem.toFront();

        return {
            image: imageElem,
            text: textElem,
            rect: rectElem,
            width: rectWidth,
            height: config.rect.height
        };
    };

    TopologyDiagram.prototype.createPath = function (startX, startY, middleX, middleY, endX, endY, hasArrow) {
        var config = this.config.path,
            paper = this.paper.element;

        return paper.path('M' + startX + ' ' + startY +
            'L' + middleX + ' ' + middleY +
            'L' + endX + ' ' + endY
        ).attr({
            'stroke-width': config['stroke-width'],
            'stroke': config.stroke,
            'arrow-end': hasArrow === false ? 'none' : config['arrow-end']
        });
    };

    TopologyDiagram.prototype.createStraightLine = function (startX, startY, endX, endY, hasArrow) {
        return this.createPath(startX, startY, endX, endY, endX, endY, hasArrow);
    };

    TopologyDiagram.prototype.createBrokenLine = function (startX, startY, endX, endY) {
        var middleX = startX,
            middleY = endY;

        return this.createPath(startX, startY, middleX, middleY, endX, endY);
    };

    TopologyDiagram.prototype.setMergeTopologyNode = function (currentNode, parentNode) {
        // var nodeMergeHash = this.nodeMergeHash,
        // nodeMergeValue = currentData[this.nodeMergeKey] || null,
        var config = this.config,
            // relateTypeEnum = config.relateTypeEnum,
            nodeHeight = config.rect.height,
            nodeOffsetY = config.node['margin-top'],
            children,
            childItem;

        // 追加子节点
        // currentNode = nodeMergeHash[nodeMergeValue];
        children = currentNode.parentNodes[0].childrenNodes;
        parentNode.childrenNodes = children;
        // 追加父节点
        for (var i = 0, len = children.length; i < len; i++) {
            childItem = children[i];
            childItem.parentNodes.push(parentNode);
        }
        // 调整关联节点的位置
        parentNode.offsetY = 0;
        parentNode.y = parentNode.prevNode.y + nodeOffsetY + nodeHeight;
        this.moveTopologyNode(parentNode);
    };

    TopologyDiagram.prototype.createTopologyNode = function (data, parentNode) {
        var currentData = data,
            nodeElements,
            id = this.getId(),
            src = currentData.src,
            text = currentData.text,
            // config = this.config,
            // relateTypeEnum = config.relateTypeEnum,
            // nodeHeight = config.rect.height,
            // nodeOffsetY = config.node['margin-top'],
            position,
            nodes = this.nodes,
            nodesHash = this.nodesHash,
            nodeMergeHash = this.nodeMergeHash,
            currentNode,
            prevNode,
            nodeMergeValue = currentData[this.nodeMergeKey] || null;

        currentNode = {
            id: id,
            // isRoot: false,
            x: 0,
            y: 0,
            text: text,
            src: src,
            width: 0,
            height: 0,
            originalData: currentData,
            parentNodes: [],
            childrenNodes: [],
            prevNode: null,
            nextNode: null,
            // siblingsIndex: siblingsIndex,
            // siblingsCount: siblingsCount,
            line: {
                start: false,
                end: false
            },
            // _offsetY: 0,
            offsetY: 0
        };

        if (nodeMergeValue !== null && nodeMergeHash[nodeMergeValue]) {
            // debugger;
            // // 追加子节点
            currentNode = nodeMergeHash[nodeMergeValue];
            // parentNode.childrenNodes = currentNode.parentNodes[0].childrenNodes;
            // // 追加父节点

            // // 调整关联节点的位置
            // parentNode.offsetY = 0;
            // parentNode.y = parentNode.prevNode.y + nodeOffsetY + nodeHeight;
            // this.moveTopologyNode(parentNode);
            this.setMergeTopologyNode(currentNode, parentNode);
            return null;
        }

        if (parentNode) {
            // 创建下级节点

            if (parentNode.childrenNodes.length > 0) {
                prevNode = parentNode.childrenNodes[parentNode.childrenNodes.length - 1];

                prevNode.nextNode = currentNode;
                currentNode.prevNode = prevNode;
            }
            currentNode.parentNodes = [parentNode];
            parentNode.childrenNodes.push(currentNode);
        }

        // 先创建出节点元素，获取其宽度和高度
        nodeElements = this.createNode(this.virtualRootNode.x, this.virtualRootNode.y, src, text, id);
        currentNode.width = nodeElements.width;
        currentNode.height = nodeElements.height;
        currentNode.nodeElements = nodeElements;

        position = this.CalculateTopologyNodePosition(parentNode, currentNode);

        $.extend(currentNode, {
            x: position.x,
            y: position.y,
            offsetY: position.offsetY
        });

        // 移动节点元素位置
        this.moveTopologyNode(currentNode);

        // 将根节点加入nodes保存
        nodesHash[id] = currentNode;
        nodeMergeHash[nodeMergeValue] = currentNode;

        // 记录根节点
        if (parentNode.virtualRoot === true) {
            nodes.push(currentNode);
        }

        return currentNode;
    };

    TopologyDiagram.prototype.moveTopologyNode = function (node) {
        var nodeElements = node.nodeElements,
            rect = nodeElements.rect,
            text = nodeElements.text,
            image = nodeElements.image,
            x = node.x,
            y = node.y,
            offsetX = x === null ? 0 : x - rect.attrs.x,
            offsetY = y === null ? 0 : y - rect.attrs.y;

        if (offsetX === 0 && offsetY === 0) {
            return;
        }
        rect.attr({
            x: rect.attrs.x + offsetX,
            y: rect.attrs.y + offsetY
        });
        text.attr({
            x: text.attrs.x + offsetX,
            y: text.attrs.y + offsetY
        });
        image.attr({
            x: image.attrs.x + offsetX,
            y: image.attrs.y + offsetY
        });
    };

    TopologyDiagram.prototype.relateTopologyNode = function (parentNode, currentNode) {
        var childrenNodes = parentNode.childrenNodes,
            childrenCount = childrenNodes.length,
            childItem,
            isExist = false;

        for (var i = 0; i < childrenCount; i++) {
            childItem = childrenNodes[i];
            if (childItem.id === currentNode.id) {
                isExist = true;
                break;
            }
        }

        if (!isExist) {
            parentNode.childrenNodes.push(currentNode);
            currentNode.parentNodes.push(parentNode);
        }

        // return currentNode;
    };

    TopologyDiagram.prototype.CalculateTopologyNodePosition = function (parentNode, currentNode) {
        // relateType必须存在，没有传入则默认为虚拟根节点
        if (!parentNode) {
            parentNode = this.virtualRootNode;
        }

        var config = this.config,
            nodeWidth = parentNode.width,
            x = parentNode.x,
            y = parentNode.y,
            // relateTypeEnum = config.relateTypeEnum,
            nodeOffset = {
                x: config.node['margin-left'],
                y: config.node['margin-top']
            },
            nodeHeight = config.rect.height,
            positionOffsetY = 0,
            prevNode = currentNode.prevNode,
            // 计算标准偏移量相关参数
            currentItemChild = currentNode.originalData.children,
            currentItemChildCount = currentItemChild.length,
            // 计算offsetTop累计实际偏移量相关参数
            prevNodeChildren,
            prevNodeChildrenCount,
            prevNodeChildItem;

        // // 如果是下级节点x坐标正移
        // if (relateType === relateTypeEnum.child) {
        //     x += nodeWidth + nodeOffset.x;
        // } else if (relateType === relateTypeEnum.parent) {
        //     x -= (nodeOffset.x + nodeWidth);
        // }

        x += nodeWidth + nodeOffset.x;

        // 计算同辈节点中首个节点的起始位置
        if (prevNode) {
            x = prevNode.x;
            y = prevNode.y + nodeHeight + nodeOffset.y;
        }

        if (currentItemChildCount > 1) {
            positionOffsetY = (currentItemChildCount - 1) * (nodeHeight + nodeOffset.y);
        }

        // 计算prevNode节点Y值实际的下偏移量（通过计算累加下级节点的偏移量得到）
        if (prevNode) {
            // 追加全部子节点的偏移量
            if (prevNode) {
                prevNodeChildren = prevNode.childrenNodes;

                prevNodeChildrenCount = prevNodeChildren.length;
                for (var i = 0; i < prevNodeChildrenCount; i++) {
                    prevNodeChildItem = prevNodeChildren[i];
                    prevNode.offsetY += prevNodeChildItem.offsetY;
                }
            }
            y += prevNode.offsetY;
        }

        return {
            x: x,
            y: y,
            // 自身由子节点个数造成的标准偏移量
            // '_offsetY': positionOffsetY,
            // 全部子节点累计的偏移量
            offsetY: positionOffsetY
        };
    };

    TopologyDiagram.prototype.loadTopologyNodes = function () {
        this.AddTopologyNodes(this.data, this.virtualRootNode);
        this.createTopologyAllLine();
    };

    TopologyDiagram.prototype.AddTopologyNodes = function (data, parentNode) {
        var node;

        if (data && data instanceof Array) {
            for (var i = 0, len = data.length; i < len; i++) {
                var item = data[i],
                    children = item.children;

                // 合并的节点返回null
                node = this.createTopologyNode(item, parentNode);

                if (node) {
                    if (children && children.length > 0) {
                        this.AddTopologyNodes(children, node);
                    }
                } else {
                    break;
                }
            }
        }
    };

    // // 基于原始的拓扑图，美化拓扑图展示：使父节点位置居中
    // TopologyDiagram.prototype.fixTopologyNodesPosition = function (nodes) {
    //     return;
    //     var node,
    //         childrenNodes,
    //         firstChild,
    //         // firstChildItem,
    //         lastChild,
    //         y,
    //         offset,
    //         offsetY = {
    //             top: 0,
    //             bottom: 0
    //         },
    //         nodeHeight = this.config.rect.height;
    //     // lastChildItem;
    //     // debugger;
    //     for (var i, len = nodes.length; i < len; i++) {
    //         childrenNodes = node.childrenNodes;
    //         this.fixTopologyNodesPosition(childrenNodes);
    //         if (node.virtualRoot !== true && childrenNodes.length > 1) {
    //             firstChild = childrenNodes[0];
    //             lastChild = childrenNodes[childrenNodes.length - 1];

    //             offset = (lastChild.y - firstChild.y) / 2;
    //             offsetY.top = offset - nodeHeight / 2;
    //             offsetY.bottom = offset + nodeHeight / 2;
    //             y = firstChild.y + offset;
    //             node.y = y;
    //             console.log(node.text + '$before:' + (node.offsetY.top + node.offsetY.bottom));
    //             console.log(node.text + '$after:' + (offsetY.top + offsetY.bottom));
    //             node.offsetY = offsetY;
    //             this.moveTopologyNode(node, null, y);
    //         }
    //     }
    // };

    TopologyDiagram.prototype.createTopologyAllLine = function () {
        var nodes = this.nodesHash,
            config = this.config,
            pathWidth = config.path['stroke-width'],
            offsetX = this.config.node['margin-left'] / 2;

        for (var k in nodes) {
            var current = nodes[k],
                parent = current.parentNodes,
                children = current.childrenNodes,
                currentX = current.x + current.width,
                currentY = current.y + current.height / 2,
                // parentX = parent.x + parent.width,
                // parentY = parent.y + parent.height / 2,
                // 父节点
                parentLength,
                // parentItem,
                parentItemFirst,
                parentItemEnd,
                parentItemFirstY,
                parentItemEndY,
                parentX,
                // parentY,
                // 子节点
                childrenLength,
                childItem,
                childItemFirst,
                childItemEnd,
                childItemFirstY,
                childItemEndY,
                childX,
                childY;

            // 对普通的节点画竖线
            if (children && children.length > 0) {
                childrenLength = children.length;
                // 中间的横线
                current.line.end = true;
                this.createStraightLine(currentX, currentY, currentX + offsetX, currentY, false);
                // 竖线
                childItemFirst = children[0];
                childItemEnd = children[childrenLength - 1];
                childItemFirstY = childItemFirst.y + childItemFirst.height / 2 - pathWidth;
                childItemEndY = childItemEnd.y + childItemEnd.height / 2 + pathWidth;

                currentX += offsetX;
                this.createStraightLine(currentX, childItemFirstY, currentX, childItemEndY, false);

                for (var i = 0, len = childrenLength; i < len; i++) {
                    childItem = children[i];
                    childX = childItem.x;
                    childY = childItem.y + childItem.height / 2;
                    if (!childItem.line.start) {
                        childItem.line.start = true;
                        this.createStraightLine(currentX, childY, childX, childY);
                    }
                }
            }

            // 对合并的节点画竖线
            if (parent && parent.length > 1) {
                parentLength = parent.length;
                parentItemFirst = parent[0];
                parentItemEnd = parent[parentLength - 1];
                parentItemFirstY = parentItemFirst.y + parentItemFirst.height / 2 - pathWidth;
                parentItemEndY = parentItemEnd.y + parentItemEnd.height / 2 + pathWidth;
                parentX = current.x - offsetX;
                this.createStraightLine(parentX, parentItemFirstY, parentX, parentItemEndY, false);
            }
        }
    };

    TopologyDiagram.prototype.getId = (function () {
        var id = 0;
        return function () {
            return ++id;
        };
    })();

    var topology = jQuery.fn.topology;

    // topology = function (data) {
    //     topologyDiagram = new TopologyDiagram(this, Raphael, data);
    // };

    // topology.addNode = function (data) {

    // };

    $.fn.extend({
        topology: function (data) {
            var topologyDiagram = new TopologyDiagram(this[0], Raphael, data);
            topologyDiagram.loadTopologyNodes();
        }
    });
})(jQuery, Raphael);
