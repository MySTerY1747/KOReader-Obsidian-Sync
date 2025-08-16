local ReaderHighlight = require("apps/reader/modules/readerhighlight")
local _ = require("gettext")
local C_ = _.pgettext
local UIManager = require("ui/uimanager")
local util = require("util")
local Event = require("ui/event")
local Notification = require("ui/widget/notification")
local logger = require("logger")
local Device = require("device")

-- Store the original function to call it later if needed
local orig_init = ReaderHighlight.init

function ReaderHighlight:init()
	orig_init(self)

	--- rearrange these as you like
	-- "item" structure like explained in "01_select"
	self._highlight_buttons = {

		["01_underline"] = function(this)
			return {
				text = _("Underline"),
				enabled = this.hold_pos ~= nil,
				callback = function()
					this:saveHighlightFormatted(true, "underscore", "gray")
					this:onClose()
				end,
			}
		end,
		-- highlight and add_note are for the document itself,
		-- so we put them first.
		--- start of button
		["02_highlight"] = function(this) -- ["name for button"]=buttons get selected based on numerical order. If you change one, renumber all buttons
			return {
				text = _("Important"), -- the text that will show on the button
				enabled = this.hold_pos ~= nil, -- triggers the button (don't change)
				callback = function()
					this:saveHighlightFormatted(true, "lighten", "red") -- the stuff it does
					this:onClose()
				end,
			}
		end,
		--- end of button
		["03_highlight"] = function(this)
			return {
				text = _("Funny"),
				enabled = this.hold_pos ~= nil,
				callback = function()
					this:saveHighlightFormatted(true, "lighten", "yellow")
					this:onClose()
				end,
			}
		end,

		["04_highlight"] = function(this)
			return {
				text = _("Quote"),
				enabled = this.hold_pos ~= nil,
				callback = function()
					this:saveHighlightFormatted(true, "lighten", "blue")
					this:onClose()
				end,
			}
		end,
		["05_highlight"] = function(this)
			return {
				text = _("Lore"),
				enabled = this.hold_pos ~= nil,
				callback = function()
					this:saveHighlightFormatted(true, "lighten", "olive")
					this:onClose()
				end,
			}
		end,

		["06_highlight"] = function(this)
			return {
				text = _("Character"),
				enabled = this.hold_pos ~= nil,
				callback = function()
					this:saveHighlightFormatted(true, "lighten", "cyan")
					this:onClose()
				end,
			}
		end,
		["07_highlight"] = function(this)
			return {
				text = _("Memorable"),
				enabled = this.hold_pos ~= nil,
				callback = function()
					this:saveHighlightFormatted(true, "lighten", "orange")
					this:onClose()
				end,
			}
		end,
		["08_wikipedia"] = function(this)
			return {
				text = _("Wikipedia"),
				callback = function()
					UIManager:scheduleIn(0.1, function()
						this:lookupWikipedia()
						-- We don't call this:onClose(), we need the highlight
						-- to still be there, as we may Highlight it from the
						-- dict lookup widget.
					end)
				end,
			}
		end,

		["09_dictionary"] = function(this, index)
			return {
				text = _("Dictionary"),
				callback = function()
					this:lookupDict(index)
					-- We don't call this:onClose(), same reason as above
				end,
			}
		end,
	}
end

--- you can delete this function if you don't care about having the following functionality:
-- 1) having a custom function to define how highlights get made
-- 2) saving highlights with full chapter path (e.g. "Section 1 ▸ Part 1 ▸ Chapter 1", instead of just "Chapter 1")
function ReaderHighlight:saveHighlightFormatted(extend_to_sentence, hlStyle, hlColor)
	logger.dbg("save highlight")
	if self.hold_pos and not self.selected_text then
		self:highlightFromHoldPos()
	end
	if self.selected_text and self.selected_text.pos0 and self.selected_text.pos1 then
		local pg_or_xp
		if self.ui.rolling then
			if extend_to_sentence then
				local extended_text =
					self.ui.document:extendXPointersToSentenceSegment(self.selected_text.pos0, self.selected_text.pos1)
				if extended_text then
					self.selected_text = extended_text
				end
			end
			pg_or_xp = self.selected_text.pos0
		else
			pg_or_xp = self.selected_text.pos0.page
		end
		local item = {
			page = self.ui.paging and self.selected_text.pos0.page or self.selected_text.pos0,
			pos0 = self.selected_text.pos0,
			pos1 = self.selected_text.pos1,
			text = util.cleanupSelectedText(self.selected_text.text),
			drawer = hlStyle, -- choose drawer style (e.g. underline/lighten) instead of using self.view.highlight.saved_drawer
			color = hlColor, -- choose color instead of using self.view.highlight.saved_color
			-- chapter = table.concat(self.ui.toc:getFullTocTitleByPage(pg_or_xp), " ▸ "), --- comment this out to get original chapter name text
			chapter = self.ui.toc:getTocTitleByPage(pg_or_xp), -- uncomment this to get original chapter name text
		}
		if self.ui.paging then
			item.pboxes = self.selected_text.pboxes
			item.ext = self.selected_text.ext
			self:writePdfAnnotation("save", item)
		end
		local index = self.ui.annotation:addItem(item)
		self.view.footer:maybeUpdateFooter()
		self.ui:handleEvent(Event:new("AnnotationsModified", { item, nb_highlights_added = 1, index_modified = index }))
		return index
	end
end
