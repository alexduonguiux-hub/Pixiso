/** All user-facing strings. Keep keys stable; values are Vietnamese for the MVP. */
export const vi = {
  appTitle: 'Pixiso',
  appTagline: 'Tạo nhân vật pixel art isometric',
  status: {
    loading: 'Đang tải…',
    serverOffline: 'Không kết nối được máy chủ. Tính năng Mô tả tạm tắt.',
    describeDisabled: 'Chưa cấu hình ANTHROPIC_API_KEY trên máy chủ, tính năng Mô tả bị tắt.',
    describeEnabled: 'Tính năng Mô tả sẵn sàng.',
  },
  panels: {
    characters: 'Nhân vật gốc',
    parts: 'Phụ kiện',
    colors: 'Màu',
    animations: 'Animation',
    style: 'Phong cách dự án',
    export: 'Xuất',
    describe: 'Mô tả nhân vật',
  },
} as const;

export type Strings = typeof vi;
