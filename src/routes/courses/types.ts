export interface Subject {
  code: string;
  classunit: number;
  description: string;
  metaclass: number;
  title: string;
  programme: number;
  marksbook_type: string;
}

export interface Folder {
  code: string;
  subjects: Subject[];
  description: string;
  active?: number;
  id: number;
}

export interface FileItem {
  filename: string;
  size: string;
  context_uuid: string;
  mimetype: string;
  id: number;
  created_date: string;
  uuid: string;
  created_by: string;
}

export interface Lesson {
  p: string; // Period
  s: string; // Start time
  d: string; // Date
  e: string; // End time
}

export interface TermSchedule {
  t: number; // Term number
  w: number; // Week number
  l: Lesson[]; // Lessons
  n: number; // Index
}

export interface DraftJSBlock {
  key: string;
  text: string;
  type: string;
  depth: number;
  inlineStyleRanges: any[];
  entityRanges: any[];
  data: any;
}

export interface DraftJSEntityMap {
  [key: string]: {
    type: string;
    mutability: string;
    data: {
      href?: string;
      url?: string;
    };
  };
}

export interface DraftJSContent {
  blocks: DraftJSBlock[];
  entityMap: DraftJSEntityMap;
}

export interface BaseModule {
  uuid: string;
  type: string;
  prevModule: string | null;
  nextModule: string | null;
  parentModule: string | null;
}

export interface TitleModule extends BaseModule {
  content: { value: string };
}

export interface TextBlockModule extends BaseModule {
  content: {
    content: DraftJSContent;
    subcontent: any | null;
  };
}

export interface ResourceLink {
  filename: string;
  size?: string;
  context_uuid: string;
  mimetype: string;
  id: number;
  created_date: string;
  uuid: string;
  created_by: string;
  selected: boolean;
}

export interface ResourceModule extends BaseModule {
  content: {
    value: {
      resources: ResourceLink[];
    };
    updated: number;
  };
}

export interface LinkModule extends BaseModule {
  content: {
    url: string;
  };
}

export type Module = TitleModule | TextBlockModule | ResourceModule | LinkModule | BaseModule;

export interface ParsedDocument {
  document: {
    modules: Module[];
    theme: string;
  };
}

export interface UserFile {
  userfile: number;
  filename: string;
  t: string;
  size: string;
  context_uuid: string;
  i: number;
  mimetype: string;
  created_date: string;
  uuid: string;
  created_by: string;
}

export interface LessonDocument {
  updatedBy: number;
  contents: string;
  id: number;
  updatedDate: [number, number, number, number, number, number, number];
}

export interface WeeklyLessonContent {
  t: string;
  document?: LessonDocument;
  h?: string;
  i: number;
  l?: string;
  n: number;
  r?: UserFile[];
}

export interface CoursePayload {
  c: string; // Course code
  cf: FileItem[]; // Course files
  t: string; // Title
  im: string; // Image UUID
  d: TermSchedule[]; // Schedule
  u: string; // Unique ID
  document: string; // JSON string for main content
  w: WeeklyLessonContent[][]; // Weekly lesson content
}

export interface LinkPreview {
  title: string;
  description: string;
  image: string;
  url: string;
  imageWidth?: number;
  imageHeight?: number;
}
