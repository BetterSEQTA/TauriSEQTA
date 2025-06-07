import { slashVisible, slashItems, slashLocation, slashProps } from './stores';

export default {
  items: ({ query }: any) => {
    return [
      {
        title: 'To Dos',
        subtitle: 'Create a to do list with checkboxes',
        image: '/images/editor/commands/todos.png',
        command: ({ editor, range }: any) => {
          editor.commands.deleteRange(range);
          editor.commands.insertContent(
            '<ul data-type="taskList"><li data-checked="false"><li>&#8203</li></ul>'
          );
        }
      },
      {
        title: 'Heading 1',
        subtitle: 'BIG heading',
        image: '/images/editor/commands/heading.png',
        command: ({ editor, range }: any) => {
          editor.chain().focus().deleteRange(range).setNode('heading', { level: 1 }).run();
        }
      },
      {
        title: 'Heading 2',
        subtitle: 'Less Big heading',
        image: '/images/editor/commands/heading2.png',
        command: ({ editor, range }: any) => {
          editor.chain().focus().deleteRange(range).setNode('heading', { level: 2 }).run();
        }
      },
      {
        title: 'Heading 3',
        subtitle: 'Medium big heading',
        image: '/images/editor/commands/heading3.png',
        command: ({ editor, range }: any) => {
          editor.chain().focus().deleteRange(range).setNode('heading', { level: 3 }).run();
        }
      },
      {
        title: 'Bullet List',
        subtitle: 'Pew pew pew',
        image: '/images/editor/commands/bulletlist.png',
        command: ({ editor, range }: any) => {
          editor.commands.deleteRange(range);
          editor.commands.toggleBulletList();
        }
      },
      {
        title: 'Numbered List',
        subtitle: '1, 2, 3, 4...',
        image: '/images/editor/commands/numberedlist.png',
        command: ({ editor, range }: any) => {
          editor.commands.deleteRange(range);

          editor.commands.toggleOrderedList();
        }
      }
    ]
      .filter((item) => item.title.toLowerCase().startsWith(query.toLowerCase()))
      .slice(0, 10);
  },

  render: () => {
    return {
      onStart: (props: any) => {
        let editor = props.editor;
        let range = props.range;
        let location = props.clientRect();
        slashProps.set({ editor, range });
        slashVisible.set(true);
        slashLocation.set({ x: location.x, y: location.y, height: location.height });
        slashItems.set(props.items);
      },

      onUpdate(props: any) {
        slashItems.set(props.items);
      },

      onKeyDown(props: any) {
        if (props.event.key === 'Escape') {
          slashVisible.set(false);
          return true;
        }
      },

      onExit() {
        slashVisible.set(false);
      }
    };
  }
};
