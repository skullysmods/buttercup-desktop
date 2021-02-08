import * as React from "react";
import styled from "styled-components";
import { basename, join as joinPath } from "path-posix";
import { Alignment, Breadcrumb, Breadcrumbs, Button, Card, Classes, Dialog, IBreadcrumbProps, Icon, InputGroup, Intent, Navbar, Spinner } from "@blueprintjs/core";
import { FileSystemInterface } from "@buttercup/file-interface";
import { FSItem } from "../../library/fsInterface";

/*
    File Manager for connecting vaults
        Inspired by this codepen: https://codepen.io/suryansh54/pen/QQqjxv
*/

const ICON_BUTTERCUP = require("../../../../resources/images/buttercup-256.png").default;

const { useCallback, useEffect, useState } = React;

interface BreadcrumbProps {
    text: string;
    path: string;
}

interface FileChooserProps {
    callback: (path: string | null) => void;
    fsInterface: FileSystemInterface;
}

const FILE_COLOUR = "#222";
const FOLDER_COLOUR = "#F7D774";
const ICON_SIZE = 34;
const ITEM_WIDTH = 75;

const CHOOSER_MAX_WIDTH = ITEM_WIDTH * 8 + 10;
const CHOOSER_MIN_WIDTH = ITEM_WIDTH * 6 + 10;

const Chooser = styled.div`
    width: 100%;
    min-width: ${CHOOSER_MIN_WIDTH}px;
    max-width: ${CHOOSER_MAX_WIDTH}px;
    height: 100%;
    min-height: 250px;
    display: flex;
    flex-direction: column;
    justify-items: space-between;
    align-items: stretch;
`;
const ChooserContents = styled(Card)`
    margin-top: 6px;
    flex: 10 10 auto;
    display: flex;
    flex-direction: row;
    justify-content: flex-start;
    align-items: flex-start;
    flex-wrap: wrap;
    padding: 4px;
    max-height: 60vh;
    overflow-y: scroll;
`;
const ChooserItem = styled.div<{ selected?: boolean }>`
    width: ${ITEM_WIDTH}px;
    max-width: ${ITEM_WIDTH}px;
    min-width: ${ITEM_WIDTH}px;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: center;
    padding-top: 10px;
    padding-bottom: 10px;
    cursor: pointer;
    background-color: ${props => props.selected ? "rgba(255, 201, 64, 0.3)" : "transparent"};

    &:hover {
        background-color: #ddd;
    }
`;
const ChooserItemText = styled.div`
    text-align: center;
    font-weight: 450;
    font-size: 80%;
    overflow-wrap: break-word;
    width: 80%;
    margin-top: 4px;
    user-select: none;
`;
const IconImg = styled.img`
    width: ${ICON_SIZE}px;
    height: ${ICON_SIZE}px;
`;
const IconInline = styled(Icon)`
    display: inline-block;
`;

export function FileChooser(props: FileChooserProps) {
    const [currentItems, setCurrentItems] = useState<Array<FSItem>>([]);
    const [currentPath, setCurrentPath] = useState("/");
    const [loading, setLoading] = useState(false);
    const [breadcrumbs, setBreadcrumbs] = useState<Array<BreadcrumbProps>>([]);
    const [showNewVaultFilenamePrompt, setShowNewVaultFilenamePrompt] = useState(false);
    const [newVaultFilename, setNewVaultFilename] = useState(null);
    const [newVault, setNewVault] = useState(null);
    const [selectedVaultPath, setSelectedVaultPath] = useState(null);
    const loadPath = useCallback(async path => {
        setLoading(true);
        const results = await props.fsInterface.getDirectoryContents({
            identifier: path,
            name: basename(path)
        });
        setCurrentItems(results);
        setLoading(false);
    }, []);
    const handleItemClick = useCallback((item: FSItem) => {
        if (item.type === "file") {
            setSelectedVaultPath(item.identifier);
        } else {
            setBreadcrumbs([
                ...breadcrumbs,
                {
                    text: currentPath === "/" ? "/" : basename(currentPath),
                    path: currentPath
                }
            ]);
            loadPath(item.identifier);
            setCurrentPath(item.identifier);
            setNewVault(null);
        }
    }, [breadcrumbs, currentPath]);
    const handlePreviousPathClick = useCallback((event, path: string) => {
        event.preventDefault();
        setBreadcrumbs(breadcrumbs.filter(bc => bc.path.length < path.length));
        loadPath(path);
        setCurrentPath(path);
        setNewVault(null);
    }, [breadcrumbs]);
    const handleNewVaultPromptClose = useCallback(() => {
        setShowNewVaultFilenamePrompt(false);
        setNewVaultFilename(null);
    }, []);
    const handleNewVaultPromptSubmit = useCallback(() => {
        setShowNewVaultFilenamePrompt(false);
        let newPath = joinPath(currentPath, newVaultFilename);
        newPath = /\.bcup$/i.test(newPath) ? newPath : `${newPath}.bcup`;
        if (currentItems.find(ci => ci.identifier === newPath)) {
            setNewVaultFilename(null);
            setNewVault(null);
            setSelectedVaultPath(null);
            return;
        }
        setNewVault(newPath);
        setSelectedVaultPath(newPath);
        setNewVaultFilename(null);
    }, [newVaultFilename, currentPath, currentItems]);
    const showNewVaultPrompt = useCallback(() => {
        setNewVaultFilename(currentPath);
        setNewVaultFilename("");
        setShowNewVaultFilenamePrompt(true);
    }, [currentPath]);
    const renderBreadcrumb = useCallback(({ text, ...restProps }: IBreadcrumbProps) => (
            <Breadcrumb {...restProps}>
                {text}
            </Breadcrumb>
        ),
        []
    );
    useEffect(() => {
        loadPath("/");
    }, []);
    return (
        <Chooser>
            <Navbar>
                <Navbar.Group align={Alignment.LEFT}>
                    <Button className="bp3-minimal" icon="new-object" text="New Vault" onClick={showNewVaultPrompt} />
                    {newVault && (
                        <Button className="bp3-minimal" icon="graph-remove" text="Cancel New" onClick={() => {
                            if (newVault ===  selectedVaultPath) {
                                setSelectedVaultPath(null);
                            }
                            setNewVault(null);
                        }} />
                    )}
                    <Navbar.Divider />
                    <Breadcrumbs
                        currentBreadcrumbRenderer={renderBreadcrumb as any}
                        items={[
                            ...breadcrumbs.map(bc => ({
                                text: bc.text,
                                onClick: evt => handlePreviousPathClick(evt, bc.path)
                            })),
                            {
                                text: currentPath === "/" ? "/" : basename(currentPath)
                            }
                        ]}
                        minVisibleItems={1}
                    />
                </Navbar.Group>
            </Navbar>
            <ChooserContents>
                {loading && (
                    <Spinner />
                )}
                {!loading && currentItems.map(item => (
                    <ChooserItem
                        key={item.identifier}
                        onClick={() => handleItemClick(item)}
                        selected={item.identifier === selectedVaultPath}
                    >
                        <Icon
                            icon={
                                item.type === "directory"
                                    ? "folder-close"
                                    : /\.bcup$/i.test(item.name)
                                        ? <IconImg src={ICON_BUTTERCUP} />
                                        : "document"
                            }
                            iconSize={ICON_SIZE}
                            color={item.type === "directory" ? FOLDER_COLOUR : FILE_COLOUR}
                        />
                        <ChooserItemText>{item.name}</ChooserItemText>
                    </ChooserItem>
                ))}
                {newVault && (
                    <ChooserItem onClick={() => setSelectedVaultPath(newVault)} selected={newVault === selectedVaultPath}>
                        <Icon
                            icon={<IconImg src={ICON_BUTTERCUP} />}
                            iconSize={ICON_SIZE}
                        />
                        <ChooserItemText><IconInline icon="plus" iconSize={10} color="#ff7373" /> {basename(newVault)}</ChooserItemText>
                    </ChooserItem>
                )}
            </ChooserContents>
            <Dialog isOpen={showNewVaultFilenamePrompt} onClose={handleNewVaultPromptClose}>
                <div className={Classes.DIALOG_HEADER}>Add Vault</div>
                <div className={Classes.DIALOG_BODY}>
                    <p>Enter a filename for the new vault:</p>
                    <InputGroup
                        onChange={evt => setNewVaultFilename(evt.target.value)}
                        placeholder="new-vault.bcup"
                        value={newVaultFilename || ""}
                    />
                </div>
                <div className={Classes.DIALOG_FOOTER}>
                    <div className={Classes.DIALOG_FOOTER_ACTIONS}>
                        <Button
                            disabled={!/[^\.]+/.test(newVaultFilename) || /[\/\\]/.test(newVaultFilename)}
                            intent={Intent.PRIMARY}
                            onClick={handleNewVaultPromptSubmit}
                            title="Confirm new vault filename"
                        >
                            Set Vault Target
                        </Button>
                        <Button
                            onClick={handleNewVaultPromptClose}
                            title="Cancel new vault creation"
                        >
                            Cancel
                        </Button>
                    </div>
                </div>
            </Dialog>
        </Chooser>
    );
}
