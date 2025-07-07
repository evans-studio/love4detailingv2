'use client';

import * as React from 'react';
import { DayPicker } from 'react-day-picker';
import { cn } from '@/lib/utils';
import 'react-day-picker/dist/style.css';

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn('p-3', className)}
      classNames={{
        months: 'flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0',
        month: 'space-y-4',
        caption: 'flex justify-center pt-1 relative items-center',
        caption_label: 'text-sm font-medium text-[#F2F2F2]',
        nav: 'space-x-1 flex items-center',
        nav_button: cn(
          'h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 text-[#F2F2F2]'
        ),
        nav_button_previous: 'absolute left-1',
        nav_button_next: 'absolute right-1',
        table: 'w-full border-collapse space-y-1',
        head_row: 'flex',
        head_cell:
          'text-[#8B8B8B] rounded-md w-9 font-normal text-[0.8rem]',
        row: 'flex w-full mt-2',
        cell: 'h-9 w-9 text-center text-sm p-0 relative text-[#F2F2F2] [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-[#262626]/50 [&:has([aria-selected])]:bg-[#262626] first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20',
        day: cn(
          'h-9 w-9 p-0 font-normal aria-selected:opacity-100 text-[#F2F2F2]'
        ),
        day_range_end: 'day-range-end',
        day_selected:
          'bg-[#9146FF] text-[#F2F2F2] hover:bg-[#9146FF] hover:text-[#F2F2F2] focus:bg-[#9146FF] focus:text-[#F2F2F2]',
        day_today: 'bg-[#262626] text-[#F2F2F2]',
        day_outside:
          'day-outside text-[#8B8B8B] opacity-50 aria-selected:bg-[#262626]/50 aria-selected:text-[#8B8B8B] aria-selected:opacity-30',
        day_disabled: 'text-[#8B8B8B] opacity-50',
        day_range_middle:
          'aria-selected:bg-[#262626] aria-selected:text-[#F2F2F2]',
        day_hidden: 'invisible',
        ...classNames,
      }}
      {...props}
    />
  );
}
Calendar.displayName = 'Calendar';

export { Calendar };