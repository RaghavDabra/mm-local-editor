import React, {useEffect, useRef, useState} from "react";
import WhoIcon from "/img/Stakeholder.png";
import DoIcon from "/img/Function.png";
import BeIcon from "/img/Cloud.png";
import FeelIcon from "/img/Heart.png";
import ConcernIcon from "/img/Risk.png";
import Nestable, {NestableProps} from "react-nestable";
import {FaPlus, FaMinus} from "react-icons/fa";
import {TreeGoal, Label, isNonFunctionalGoal, InstanceId} from "../components/types.ts";
import {BsFillTrash3Fill, BsCheckCircle, BsXCircle, BsPencilSquare } from "react-icons/bs";
import {useFileContext} from "./context/FileProvider";
import ConfirmModal from "./ConfirmModal";
import {
  isEmptyGoal,
  isTextEmpty,
  handleContentSave,
  handleGoalKeyPress,
  handleGoalBlur
} from "./utils/GoalHint.tsx"

import "./Tree.css";
import {deleteGoalFromGoalList, deleteGoalReferenceFromHierarchy, setTreeData} from "./context/treeDataSlice.ts";

// Inline style for element in Nestable, css style import not working
const treeListStyle: React.CSSProperties = {
  position: "relative",
  background: "white",
  display: "flex",
  border: "1px solid gray",
  borderRadius: "5px",
  alignItems: "center",
  padding: "0.1rem",
  minWidth: "100px",
};

const treeInputStyle: React.CSSProperties = {
  backgroundColor: "#e0e0e0",
  border: "none",
  margin: 0,
  padding: 0,
  flex: 1,
  outline: "none",
  width: "100%",
  height: "100%",
};

const iconFromType = (type: Label) => {
  const typeToIcon = {
    Be: BeIcon,
    Do: DoIcon,
    Concern: ConcernIcon,
    Feel: FeelIcon,
    Who: WhoIcon,
  };

  if (type in typeToIcon) {
    return typeToIcon[type];
  }
  throw Error(`iconFromType: Unknown type "${type}"`);
};

type TreeProps = {
  // existingItemIds: number[];
  handleSynTableTree: (treeItem: TreeGoal, editedText: string) => void;
  // setExistingItemIds: (existingItemIds: number[]) => void;
  existingGoalReferenceInstanceId: { goalId: TreeGoal["id"]; instanceId: InstanceId }[];
  setExistingGoalReferenceInstanceId: (existingGoalReferenceInstanceId: { goalId: TreeGoal["id"]; instanceId: InstanceId }[]) => void
};

// Goal icon in the tree
const IconComponent = ({type}: { type: Label }) => {
  return (
    <img
      src={iconFromType(type)}
      alt={`${type} icon`}
      className="ms-2 me-1"
      style={{
        height: type === "Who" ? "30px" : "20px",
      }}
    />
  );
};

const Tree: React.FC<TreeProps> = ({
  // existingItemIds,
  handleSynTableTree,
  // setExistingItemIds,
  existingGoalReferenceInstanceId,
  setExistingGoalReferenceInstanceId,
}) => {
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [editedText, setEditedText] = useState<string>("");
  const [disableOnBlur, setDisableOnBlur] = useState<boolean>(false);
  const [showDeleteWarning, setShowDeleteWarning] = useState(false);
  const deletingItemRef = useRef<TreeGoal | null>(null);

  // Track whether the goal currently being edited was empty when edit started
  // (i.e. it was just created via drag-and-drop and has never been named).
  // If so, cancelling or blurring without entering text should delete the goal.
  const editingWasNewEmptyGoal = useRef<boolean>(false);

  // Track the set of goal instanceIds already seen so we can detect newly added goals.
  const knownInstanceIds = useRef<Set<InstanceId>>(new Set());

  const inputRef = useRef<HTMLInputElement>(null);
  const {treeData, dispatch} = useFileContext();

  // ── Auto-enter edit mode when a new empty goal is dropped from the palette ──
  // Every time treeData changes, look for goal nodes that have empty content and
  // whose instanceId we haven't seen before.  Those are freshly drag-and-dropped
  // symbols that need an immediate edit prompt.
  useEffect(() => {
    const findNewEmptyGoals = (nodes: TreeGoal[]): TreeGoal | null => {
      for (const node of nodes) {
        if (!knownInstanceIds.current.has(node.instanceId)) {
          // Mark every node we encounter as known going forward.
          knownInstanceIds.current.add(node.instanceId);
          if (isEmptyGoal(node)) {
            return node; // first new empty goal wins
          }
        }
        if (node.children) {
          const found = findNewEmptyGoals(node.children);
          if (found) return found;
        }
      }
      return null;
    };

    const newEmptyGoal = findNewEmptyGoals(treeData);
    if (newEmptyGoal) {
      editingWasNewEmptyGoal.current = true;
      setEditingItemId(newEmptyGoal.id);
      setEditedText("");
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  }, [treeData]);

  // Delete item by its id
  const deleteItem = () => {
    if (deletingItemRef?.current) {
      dispatch(deleteGoalReferenceFromHierarchy(deletingItemRef.current));
    }
    setShowDeleteWarning(false);
  };



  // Handle delete button clicked
  const handleDeleteItem = (item: TreeGoal) => {
    deletingItemRef.current = item;
    // const deletingIds = getAllIds(item);

    const deletingInstanceId = getAllGoalInstances(item);
    if (item.children && item.children.length > 0) {
      setExistingGoalReferenceInstanceId([...existingGoalReferenceInstanceId, ...deletingInstanceId])
      // setExistingItemIds([...existingItemIds, ...deletingIds]);
      setShowDeleteWarning(true);
    } else {
      deleteItem();
    }
  };

  // Handle cancel deleting goal with children(s)
  const handleDeleteCancel = () => {
    setShowDeleteWarning(false);
    // setExistingItemIds([]);
    setExistingGoalReferenceInstanceId([])
  };

  // // Get ids from the tree item
  // const getAllIds = (item: TreeGoal) => {
  //   const ids: number[] = [item.id];

  //   // If the item has children, recursively collect their ids
  //   if (item.children) {
  //     item.children.forEach((child) => {
  //       ids.push(...getAllIds(child));
  //     });
  //   }

  //   return ids;
  // };

  const getAllGoalInstances = (item: TreeGoal): { goalId: TreeGoal["id"]; instanceId: InstanceId }[] => {
    const result = [{goalId: item.id, instanceId: item.instanceId}];

    if (item.children) {
      item.children.forEach((child) => {
        result.push(...getAllGoalInstances(child)); // recurse into children
      });
    }

    return result;
  };

  // Function for rendering every item
  const renderItem: NestableProps["renderItem"] = ({item, collapseIcon}) => {
    const treeItem = item as TreeGoal;
    const isEditing = editingItemId === treeItem.id;

    // Delete a goal that was never given a name (created via drag-and-drop then
    // abandoned).  This removes both the tree reference and the goal-list entry.
    const deleteNewEmptyGoal = (goal: TreeGoal) => {
      dispatch(deleteGoalReferenceFromHierarchy(goal));
      dispatch(deleteGoalFromGoalList(goal));
    };

    // Handle when edit button clicked.
    // Empty goals (just dropped from palette) are explicitly allowed here —
    // that is the whole point of the fix.
    const handleEdit = () => {
      editingWasNewEmptyGoal.current = isEmptyGoal(treeItem);
      setEditingItemId(treeItem.id);
      setEditedText(treeItem.content);
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    };

    // Handle double click to start editing
    const handleDoubleClick = () => {
      if (!isEditing) {
        handleEdit();
      }
    };

    // Handle saving edited text using GoalHint
    const handleSave = () => {
      handleContentSave(
        treeItem.content, // original content
        editedText, // new content
        (content) => {
          // On save callback
          handleSynTableTree(treeItem, content);
          setEditingItemId(null);
          editingWasNewEmptyGoal.current = false;
        },
        () => {
          // On cancel callback — content was empty, so cancel
          handleCancel();
        }
      );
    };

    // Handle cancel edited text.
    // If the goal was brand-new and still has no content, remove it entirely so
    // the hierarchy is not left with a permanently-unnamed placeholder node.
    const handleCancel = () => {
      if (editingWasNewEmptyGoal.current && isEmptyGoal(treeItem)) {
        deleteNewEmptyGoal(treeItem);
      }
      setEditingItemId(null);
      setEditedText(treeItem.content);
      editingWasNewEmptyGoal.current = false;
      requestAnimationFrame(() => {
        setDisableOnBlur(false);
      });
    };

    // Handle saving edited text when lost focus using GoalHint
    const handleBlur = () => {
      handleGoalBlur(
        treeItem.content, // original content
        editedText, // current content
        (content) => {
          // On save callback
          handleSynTableTree(treeItem, content);
          setEditingItemId(null);
          editingWasNewEmptyGoal.current = false;
        },
        () => {
          // On cancel callback
          handleCancel();
        },
        disableOnBlur // should prevent blur
      );
      setDisableOnBlur(false);
    };

    // Handle save and cancel edited text when key pressed using GoalHint
    const handleEditKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      handleGoalKeyPress(
        e,
        treeItem.content, // original content
        editedText, // current content
        (content) => {
          // On save callback
          handleSynTableTree(treeItem, content);
          setEditingItemId(null);
          editingWasNewEmptyGoal.current = false;
        },
        () => {
          // On cancel callback
          handleCancel();
        }
      );
    };

    const ICON_SIZE = 25;
    const isReference = existingGoalReferenceInstanceId.some(
      ref => ref.goalId === treeItem.id && ref.instanceId === treeItem.instanceId
    );
    return (
      // While editing, set color to gray. If the drop item exist, set color to light red (#FF474C)
      <div
        style={{
          ...treeListStyle,
          backgroundColor: isEditing
            ? "#e0e0e0"
            : isReference
              ? "#FF474C"
              : "white",
        }}
        className="tree-list"
        onDoubleClick={handleDoubleClick}
      >
        {collapseIcon}
        <IconComponent type={treeItem.type} />
        <div
          style={{
            padding: ".5rem",
            flex: 1,
            overflowWrap: "break-word",
            wordBreak: "break-word",
          }}
        >
          {isEditing ? (
            <input
              ref={inputRef}
              type="text"
              value={editedText}
              onChange={(event) => setEditedText(event.target.value)}
              onBlur={handleBlur}
              onKeyDown={handleEditKeyDown}
              className={`tree-input ${isTextEmpty(editedText) ? "is-invalid" : ""}`}
              style={treeInputStyle}
              placeholder="Enter goal name…"
            />
          ) : (
            treeItem.content || <em style={{color: "#999"}}>unnamed goal</em>
          )}
        </div>

        {/* Visual feedback for empty content */}
        {isEditing && isTextEmpty(editedText) && (
          <div className="invalid-feedback d-block small">
            Content cannot be empty
          </div>
        )}

        {/* The hover effect can only created with pure css, onMouseEnter will 
            replace the Nestable onMouseEnter code and break the dragging functionality */}
        <div
          className="edit-icon"
          onClick={isEditing ? handleSave : handleEdit}
        >
          {isEditing ? (
            <BsCheckCircle size={ICON_SIZE} />
          ) : (
            <BsPencilSquare size={ICON_SIZE} />
          )}
        </div>
        <div
          className="delete-icon"
          onClick={isEditing ? handleCancel : () => handleDeleteItem(treeItem)}
          onMouseEnter={() => setDisableOnBlur(true)}
        >
          {isEditing ? (
            <BsXCircle size={ICON_SIZE} />
          ) : (
            <BsFillTrash3Fill size={ICON_SIZE} />
          )}
        </div>
      </div>
    );
  };

  // Button for collapse and expand
  const Collapser = ({isCollapsed}: { isCollapsed: boolean }) => {
    const iconSize = 13;
    return (
      <div
        style={{
          display: "flex",
          paddingLeft: "0.5rem",
          cursor: "pointer",
        }}
      >
        {isCollapsed ? <FaPlus size={iconSize} /> : <FaMinus size={iconSize} />}
      </div>
    );
  };

  return (
    <div style={{width: "100%", height: "100%", alignSelf: "flex-start", position: "relative"}}>
      <ConfirmModal
        show={showDeleteWarning}
        title="Delete Warning"
        message="You are going to delete a goal with children goals, are you sure?"
        onHide={handleDeleteCancel}
        onConfirm={deleteItem}
      />
      <Nestable
        onChange={({items}) => dispatch(setTreeData(items as TreeGoal[]))}
        confirmChange={({destinationParent}) => !isNonFunctionalGoal(destinationParent?.type)}
        items={treeData}
        renderItem={renderItem}
        idProp="instanceId"
        renderCollapseIcon={({isCollapsed}) => (
          <Collapser isCollapsed={isCollapsed} />
        )}
      />
    </div>
  );
};

export default Tree;