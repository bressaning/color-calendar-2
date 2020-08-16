export class Calendar {
  constructor({
    id = "#calendar",
    startWeekday = 0,
    weekdayType = "short",
    monthDisplayType = "long",
    color = undefined,
    fontFamily1 = undefined,
    fontFamily2 = undefined,
    dropShadow = true,
    border = true,
    theme = "default",
    eventsData = [],
    dayClicked = undefined,
  } = {}) {
    this.monthDisplayType = monthDisplayType;
    this.DAYS_TO_DISPLAY = 42;
    switch (weekdayType) {
      case "long":
        this.WEEKDAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
        break;
      case "long-lower":
        this.WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        break;
      default:
        this.WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
    }
    this.id = id;
    this.START_WEEKDAY = startWeekday; // 0 (Sun), 1 (Mon), 2 (Tues), 3 (Wed), 4 (Thurs), 5 (Fri), 6 (Sat)
    this.eventsData = eventsData;
    this.eventDayMap = {};
    this.oldSelectedNode = null;
    this.filteredEventsThisMonth = null;
    this.dayClicked = dayClicked;

    this.theme = theme;
    this.color = color;
    this.fontFamily1 = fontFamily1;
    this.fontFamily2 = fontFamily2;
    this.dropShadow = dropShadow;
    this.border = border;

    this.today = new Date();
    this.currentDate = new Date();
    this.selectedDate = new Date();

    this.clearCalendarDays();
    this.resetCalendar();
  }

  resetCalendar() {
    this.initializeLayout();
    this.updateMonthYear();
    this.generateWeekdays();
    this.generateDays();
    this.selectDayInitial();
    this.renderDays();
  }

  initializeLayout() {
    this.calendar = document.querySelector(this.id);
    this.calendar.innerHTML = `
      <div class="calendar ${this.theme}">
        <div class="calendar__header">
          <div class="calendar__arrow calendar__arrow-prev"><div class="calendar__arrow-inner"></div></div>
          <div class="calendar__month"></div>
          <div class="calendar__arrow calendar__arrow-next"><div class="calendar__arrow-inner"></div></div>
        </div>
        <div class="calendar__body">
          <div class="calendar__weekdays"></div>
          <div class="calendar__days"></div>
        </div>
      </div>
    `;

    this.configureStylePreferences();

    this.calendarMonthYear = document.querySelector(
      `${this.id} .calendar__month`
    );
    this.calendarWeekdays = document.querySelector(
      `${this.id} .calendar__weekdays`
    );
    this.calendarDays = document.querySelector(`${this.id} .calendar__days`);

    this.prevButton = document.querySelector(
      `${this.id} .calendar__arrow-prev .calendar__arrow-inner`
    );
    this.nextButton = document.querySelector(
      `${this.id} .calendar__arrow-next .calendar__arrow-inner`
    );
    this.prevButton.addEventListener(
      "click",
      this.handlePrevMonthButtonClick.bind(this)
    );
    this.nextButton.addEventListener(
      "click",
      this.handleNextMonthButtonClick.bind(this)
    );

    this.calendarDays.addEventListener(
      "click",
      this.handleCalendarDayClick.bind(this)
    );
  }

  /** Configure calendar style preferences */
  configureStylePreferences() {
    // let root = document.documentElement;
    let root = document.querySelector(`${this.id} .calendar`);
    if (this.color) {
      root.style.setProperty("--cal-color-primary", this.color);
    }
    if (this.fontFamily1) {
      root.style.setProperty("--cal-font-family-1", this.fontFamily1);
    }
    if (this.fontFamily2) {
      root.style.setProperty("--cal-font-family-2", this.fontFamily2);
    }
    if (!this.dropShadow) {
      root.style.setProperty("--cal-drop-shadow", "none");
    }
    if (!this.border) {
      root.style.setProperty("--cal-border", "none");
    }
  }

  /** Clear day values */
  clearCalendarDays() {
    this.daysIn_PrevMonth = [];
    this.daysIn_CurrentMonth = [];
    this.daysIn_NextMonth = [];
  }

  updateCalendar(isMonthChanged) {
    if (isMonthChanged) {
      this.updateMonthYear();
      this.clearCalendarDays();
      this.generateDays();
      this.selectDayInitial();
    }
    this.renderDays();
  }

  selectDayInitial() {
    let isTodayMonth = this.today.getMonth() === this.currentDate.getMonth();
    if(isTodayMonth) {
      this.daysIn_CurrentMonth[this.today.getDate() - 1].selected = true;
    } else {
      this.daysIn_CurrentMonth[0].selected = true;
    }
  }

  getEventsData() {
    return JSON.parse(JSON.stringify(this.eventsData));
  }

  /** Set new events data array */
  setEventsData(data) {
    this.eventsData = JSON.parse(JSON.stringify(data));
    this.updateCalendar();
    return this.eventsData;
  }

  /** Add events to existing events data array */
  addEventsData(newEvents) {
    const eventCount = this.eventsData.push(...newEvents);
    this.updateCalendar();
    return eventCount;
  }

  handleCalendarDayClick(e) {
    if (
      !(
        e.target.classList.contains("calendar__day-text") ||
        e.target.classList.contains("calendar__day-box") ||
        e.target.classList.contains("calendar__day-box-today") ||
        e.target.classList.contains("calendar__day-bullet")
      ) ||
      e.target.parentElement.classList.contains("calendar__day-selected")
    ) {
      return;
    }

    // Error check for old selected node
    if (
      this.oldSelectedNode &&
      !this.oldSelectedNode[0].previousElementSibling
    ) {
      return;
    }

    // Find which day of the month is clicked
    let day;
    let dayNum;
    day = e.target.parentElement.innerText;
    dayNum = parseInt(day, 10);

    //Remove old day selection
    if (this.oldSelectedNode) {
      Object.assign(this.daysIn_CurrentMonth[this.oldSelectedNode[1] - 1], {
        selected: false,
      });
      this.rerenderSelectedDay(
        this.oldSelectedNode[0],
        this.oldSelectedNode[1]
      );
    }

    // Select clicked day
    if (day) {
      this.updateCurrentDate(0, dayNum);
      Object.assign(this.daysIn_CurrentMonth[dayNum - 1], { selected: true });
      this.rerenderSelectedDay(e.target.parentElement, dayNum, true);
      
      let filteredEventsThisDate = this.filteredEventsThisMonth.filter(
        (event) => {
          const start = new Date(event.start).getDate();
          const end = new Date(event.end).getDate();
          if (this.currentDate.getDate() >= start && this.currentDate.getDate() <= end) {
            return true;
          } else {
            return false;
          }
        }
      );
      if(this.dayClicked) {
        this.dayClicked(filteredEventsThisDate);
      }
    }
  }

  handlePrevMonthButtonClick() {
    this.updateCurrentDate(-1);
  }

  handleNextMonthButtonClick() {
    this.updateCurrentDate(1);
  }

  resetCurrentDate() {
    this.updateCurrentDate(0);
  }

  /**
   *  0 - Do not change month
   * -1 - Go to previous month
   *  1 - Go to next month
   * @param {number} monthOffset - Months to go backward or forward
   */
  updateCurrentDate(monthOffset, newDay, resetToToday) {
    this.currentDate = new Date(
      this.currentDate.getFullYear(),
      resetToToday
        ? this.today.getMonth()
        : this.currentDate.getMonth() + monthOffset,
      ((monthOffset !== 0) || !newDay) ? 1 : newDay
    );
    if(monthOffset !== 0) {
      this.updateCalendar(true);
    }
  }

  /** Update Month and Year HTML */
  updateMonthYear() {
    this.oldSelectedNode = null;
    this.calendarMonthYear.innerHTML = `
      ${new Intl.DateTimeFormat("default", {
        month: this.monthDisplayType,
      }).format(this.currentDate)} ${this.currentDate.getFullYear()}
    `;
  }

  generateWeekdays() {
    this.calendarWeekdays.innerHTML = "";
    for (let i = 0; i < 7; i++) {
      this.calendarWeekdays.innerHTML += `
        <div class="calendar__weekday">${
          this.WEEKDAYS[(i + this.START_WEEKDAY) % 7]
        }</div>
      `;
    }
  }

  /** Compute the day values in current month, and previous month number of days */
  generateDays() {
    // Previous Month
    // this.firstDay_PrevMonth = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() - 1, 1).getDay();
    this.numOfDays_PrevMonth = new Date(
      this.currentDate.getFullYear(),
      this.currentDate.getMonth(),
      0
    ).getDate();
    // for (let i = 0; i < this.numOfDays_PrevMonth; i++) {
    //   this.daysIn_PrevMonth.push({ day: i + 1, selected: false });
    // }

    // Current Month
    this.firstDay_CurrentMonth = new Date(
      this.currentDate.getFullYear(),
      this.currentDate.getMonth(),
      1
    ).getDay();
    this.numOfDays_CurrentMonth = new Date(
      this.currentDate.getFullYear(),
      this.currentDate.getMonth() + 1,
      0
    ).getDate();
    for (let i = 0; i < this.numOfDays_CurrentMonth; i++) {
      this.daysIn_CurrentMonth.push({ day: i + 1, selected: false });
    }

    // Next Month
    // this.firstDay_NextMonth = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 1).getDay();
    // this.numOfDays_NextMonth = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), 0).getDate();
    // for (let i = 0; i < this.numOfDays_NextMonth; i++) {
    //   this.daysIn_NextMonth.push({ day: i + 1, selected: false });
    // }
  }

  /** Render days */
  renderDays() {
    this.calendarDays.innerHTML = "";
    let insertCount = 0;

    // Filter events data to this month only
    const currentMonth = this.currentDate.getMonth();
    this.filteredEventsThisMonth = this.eventsData.filter((event) => {
      if (new Date(event.start).getMonth() === currentMonth) {
        return true;
      } else {
        return false;
      }
    });

    // Create object of all days that have events
    this.eventDayMap = {};
    this.filteredEventsThisMonth.forEach((event) => {
      const start = new Date(event.start).getDate();
      const end = new Date(event.end).getDate();
      for(let i = start; i <= end; i++) {
        this.eventDayMap[i] = true;
      }
    });

    // Weekday Offset calculation
    let dayOffset;
    if (this.firstDay_CurrentMonth < this.START_WEEKDAY) {
      dayOffset = 7 + this.firstDay_CurrentMonth - this.START_WEEKDAY;
    } else {
      dayOffset = this.firstDay_CurrentMonth - this.START_WEEKDAY;
    }

    // Prev Month (Light)
    for (let i = 0; i < dayOffset; i++) {
      this.calendarDays.innerHTML += `
        <div class="calendar__day calendar__day-other">${
          this.numOfDays_PrevMonth + 1 - dayOffset + i
        }</div>
      `;
      insertCount++;
    }

    // Current Month
    let isTodayMonth = this.today.getMonth() === this.currentDate.getMonth();
    this.daysIn_CurrentMonth.forEach((day) => {
      let isTodayDate = isTodayMonth && day.day === this.today.getDate();
      this.calendarDays.innerHTML += `
        <div class="calendar__day${isTodayDate ? ' calendar__day-today' : ''}${
        this.eventDayMap[day.day]
          ? ' calendar__day-event'
          : ' calendar__day-no-event'
      }${day.selected ? ' calendar__day-selected' : ''}">
          <span class="calendar__day-text">${day.day}</span>
          <div class="calendar__day-box"></div>
          <div class="calendar__day-bullet"></div>
          ${isTodayDate ? '<div class="calendar__day-box-today"></div>' : ''}
        </div>
      `;
      insertCount++;
    });

    // Next Month (Light)
    for (let i = 0; i < this.DAYS_TO_DISPLAY - insertCount; i++) {
      this.calendarDays.innerHTML += `
        <div class="calendar__day calendar__day-other">${i + 1}</div>
      `;
    }
  }

  rerenderSelectedDay(element, dayNum, storeOldSelected) {
    // Get reference to previous day
    let previousElement = element.previousElementSibling;

    // Remove day from DOM
    element.remove(element);

    // Add new day to DOM
    let isTodayMonth = this.today.getMonth() === this.currentDate.getMonth();
    let isTodayDate = isTodayMonth && dayNum === this.today.getDate();
    let div = document.createElement("div");
    div.className += `calendar__day${
      isTodayDate ? " calendar__day-today" : ""
    }${
      this.eventDayMap[dayNum]
        ? " calendar__day-event"
        : " calendar__day-no-event"
    }${
      this.daysIn_CurrentMonth[dayNum - 1].selected
        ? " calendar__day-selected"
        : ""
    }`;
    div.innerHTML = `
      <span class="calendar__day-text">${dayNum}</span>
      <div class="calendar__day-box"></div>
      <div class="calendar__day-bullet"></div>
      ${isTodayDate ? '<div class="calendar__day-box-today"></div>' : ""}
    `;

    previousElement.parentElement.insertBefore(
      div,
      previousElement.nextSibling
    );

    if (storeOldSelected) {
      this.oldSelectedNode = [div, dayNum];
    }
  }
}